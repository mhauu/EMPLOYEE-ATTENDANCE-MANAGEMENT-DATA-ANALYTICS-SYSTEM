import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateLeaveRequestInput,
  ReviewLeaveInput,
  LeaveQueryInput,
} from '../validators/leave.validator';

function countBusinessDays(start: Date, end: Date): number {
  // Đếm số ngày làm việc thực tế (Thứ 2 đến Thứ 6)
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export class LeaveService {
  async getLeaveTypes() {
    return prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBalances(employeeId: string, year: number) {
    return prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  async createRequest(
    employeeId: string,
    userId: string,
    input: CreateLeaveRequestInput
  ) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const totalDays = countBusinessDays(start, end);

    if (totalDays <= 0) {
      throw new AppError('Khoảng thời gian xin nghỉ phải bao gồm ít nhất 1 ngày làm việc (Thứ 2 - Thứ 6).', 400, 'NGAY_NGHI_KHONG_HOP_LE');
    }

    // Kiểm tra loại phép có tồn tại
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: input.leaveTypeId },
    });
    if (!leaveType) {
      throw new AppError('Loại nghỉ phép không tồn tại trong hệ thống.', 404, 'KHONG_TIM_THAY_LOAI_PHEP');
    }

    // Kiểm tra trùng lặp lịch nghỉ đã xin trước đó
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });
    if (overlap) {
      throw new AppError(
        'Bạn đã có một đơn nghỉ phép khác trùng hoặc giao thoa với khoảng thời gian này.',
        409,
        'TRUNG_LICH_NGHI'
      );
    }

    // Kiểm tra số ngày phép khả dụng trong năm hiện tại
    const year = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId: input.leaveTypeId,
          year,
        },
      },
    });

    const availableDays = balance
      ? balance.totalDays - Number(balance.usedDays) - Number(balance.pendingDays)
      : 0;

    if (balance && availableDays < totalDays) {
      throw new AppError(
        `Quỹ phép không đủ! Số ngày phép còn lại: ${availableDays} ngày, số ngày yêu cầu: ${totalDays} ngày.`,
        400,
        'KHONG_DU_PHEP'
      );
    }

    const request = await prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.create({
        data: {
          employeeId,
          leaveTypeId: input.leaveTypeId,
          startDate: start,
          endDate: end,
          totalDays,
          reason: input.reason,
          status: 'PENDING',
        },
        include: {
          leaveType: true,
          employee: { select: { fullName: true } },
        },
      });

      // Tăng số ngày phép đang chờ duyệt trong quỹ
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: { increment: totalDays } },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          title: 'Đã gửi đơn xin nghỉ phép',
          message: `Đơn xin nghỉ phép "${leaveType.name}" (${totalDays} ngày) đã được gửi đến quản lý để phê duyệt.`,
          type: 'LEAVE_SUBMITTED',
        },
      });

      return req;
    });

    return request;
  }

  async approve(requestId: string, reviewerUserId: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            user: true,
            shiftAssignments: { where: { isActive: true }, take: 1 },
            locationAssignments: { where: { isActive: true }, take: 1 },
          },
        },
        leaveType: true,
      },
    });

    if (!request) throw new AppError('Không tìm thấy đơn nghỉ phép.', 404, 'KHONG_TIM_THAY');
    if (request.status !== 'PENDING') {
      throw new AppError('Chỉ có thể phê duyệt các đơn đang ở trạng thái chờ duyệt.', 400, 'TRANG_THAI_KHONG_HOP_LE');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái đơn
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      // 2. Chuyển số ngày từ "chờ duyệt" sang "đã sử dụng" trong quỹ phép
      const year = new Date().getFullYear();
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: {
          usedDays: { increment: Number(request.totalDays) },
          pendingDays: { decrement: Number(request.totalDays) },
        },
      });

      // 3. Tự động sinh bản ghi điểm danh trạng thái "Nghỉ phép" cho các ngày làm việc
      const shiftId = request.employee.shiftAssignments[0]?.shiftId;
      const locationId = request.employee.locationAssignments[0]?.locationId;

      if (shiftId && locationId) {
        const curDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);

        while (curDate <= endDate) {
          const dayOfWeek = curDate.getDay();
          // Chỉ tạo cho ngày làm việc (Thứ 2 đến Thứ 6)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateToRecord = new Date(curDate);
            dateToRecord.setHours(0, 0, 0, 0);

            // Kiểm tra xem đã có bản ghi chưa
            const existAtt = await tx.attendance.findUnique({
              where: {
                employeeId_workDate: {
                  employeeId: request.employeeId,
                  workDate: dateToRecord,
                },
              },
            });

            if (!existAtt) {
              await tx.attendance.create({
                data: {
                  employeeId: request.employeeId,
                  shiftId,
                  locationId,
                  workDate: dateToRecord,
                  status: 'LEAVE',
                  workingHours: 0,
                  notes: `Nghỉ phép đã được duyệt: ${request.leaveType.name}`,
                },
              });
            } else {
              await tx.attendance.update({
                where: { id: existAtt.id },
                data: {
                  status: 'LEAVE',
                  notes: `Cập nhật theo đơn nghỉ phép đã duyệt: ${request.leaveType.name}`,
                },
              });
            }
          }
          curDate.setDate(curDate.getDate() + 1);
        }
      }

      // 4. Ghi nhật ký kiểm toán
      await tx.auditLog.create({
        data: {
          userId: reviewerUserId,
          action: 'APPROVE',
          entity: 'DonNghiPhep',
          entityId: requestId,
          description: `Phê duyệt đơn nghỉ phép của nhân viên ${request.employee.fullName}`,
        },
      });

      // 5. Gửi thông báo cho nhân viên
      await tx.notification.create({
        data: {
          userId: request.employee.userId,
          title: 'Đơn nghỉ phép đã được phê duyệt',
          message: `Đơn xin nghỉ phép "${request.leaveType.name}" của bạn đã được phê duyệt thành công.`,
          type: 'LEAVE_APPROVED',
        },
      });
    });

    return { message: 'Phê duyệt đơn nghỉ phép thành công' };
  }

  async reject(
    requestId: string,
    reviewerUserId: string,
    input: ReviewLeaveInput
  ) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { include: { user: true } },
        leaveType: true,
      },
    });

    if (!request) throw new AppError('Không tìm thấy đơn nghỉ phép.', 404, 'KHONG_TIM_THAY');
    if (request.status !== 'PENDING') {
      throw new AppError('Chỉ có thể từ chối các đơn đang ở trạng thái chờ duyệt.', 400, 'TRANG_THAI_KHONG_HOP_LE');
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason,
        },
      });

      // Hoàn trả ngày phép chờ duyệt vào quỹ
      const year = new Date().getFullYear();
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: {
          pendingDays: { decrement: Number(request.totalDays) },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: reviewerUserId,
          action: 'REJECT',
          entity: 'DonNghiPhep',
          entityId: requestId,
          description: `Từ chối đơn nghỉ phép của nhân viên ${request.employee.fullName}. Lý do: ${input.rejectionReason || 'Không có'}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.employee.userId,
          title: 'Đơn nghỉ phép bị từ chối',
          message: `Đơn xin nghỉ phép "${request.leaveType.name}" của bạn đã bị từ chối.${input.rejectionReason ? ` Lý do: ${input.rejectionReason}` : ''}`,
          type: 'LEAVE_REJECTED',
        },
      });
    });

    return { message: 'Đã từ chối đơn nghỉ phép' };
  }

  async cancel(requestId: string, employeeId: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new AppError('Không tìm thấy đơn nghỉ phép.', 404, 'KHONG_TIM_THAY');
    if (request.employeeId !== employeeId) {
      throw new AppError('Bạn chỉ có quyền hủy đơn nghỉ phép của chính mình.', 403, 'TU_CHOI_QUYEN');
    }
    if (request.status !== 'PENDING') {
      throw new AppError('Chỉ có thể hủy đơn đang chờ duyệt.', 400, 'TRANG_THAI_KHONG_HOP_LE');
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      // Hoàn trả số ngày phép chờ duyệt vào quỹ
      const year = new Date().getFullYear();
      await tx.leaveBalance.updateMany({
        where: {
          employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: { pendingDays: { decrement: Number(request.totalDays) } },
      });
    });

    return { message: 'Đã hủy đơn nghỉ phép thành công' };
  }

  async findAll(query: LeaveQueryInput, requestingUserId: string, role: string) {
    const { page, limit, employeeId, leaveTypeId, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    // Giới hạn phạm vi đối với Trưởng phòng (MANAGER)
    if (role === 'MANAGER') {
      const managerEmployee = await prisma.employee.findFirst({
        where: { userId: requestingUserId },
        select: { departmentId: true },
      });
      if (managerEmployee?.departmentId) {
        where.employee = { departmentId: managerEmployee.departmentId };
      }
    }

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              fullName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          leaveType: true,
          reviewer: { select: { email: true } },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
