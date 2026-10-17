import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { isWithinRadius } from '../utils/haversine';
import {
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateOvertimeHours,
  calculateWorkingHours,
} from '../utils/date.utils';
import {
  CheckInInput,
  CheckOutInput,
  AttendanceQueryInput,
} from '../validators/attendance.validator';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceService {
  /**
   * CHẤM CÔNG VÀO CA (CHECK-IN)
   * Toàn bộ ràng buộc nghiệp vụ được kiểm soát chặt chẽ ở máy chủ:
   * 1. Nhân viên phải có trạng thái ACTIVE (Đang làm việc).
   * 2. Phải có ca làm việc được phân công hợp lệ trong ngày.
   * 3. Phải có địa điểm văn phòng được phân công hợp lệ trong ngày.
   * 4. Không cho phép chấm công trùng lặp trong cùng một ngày.
   * 5. Xác thực tọa độ GPS Geofence (Haversine): từ chối nếu vượt bán kính cho phép.
   * 6. Tính số phút đi trễ có xét thời gian ân hạn (grace period).
   */
  async checkIn(employeeId: string, userId: string, input: CheckInInput) {
    // 1. Kiểm tra trạng thái nhân viên
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    if (!employee || employee.status !== 'ACTIVE') {
      throw new AppError(
        'Chỉ nhân viên đang có trạng thái hoạt động mới được phép chấm công.',
        403,
        'NHAN_VIEN_KHONG_HOAT_DONG'
      );
    }

    // 2. Lấy ca làm việc có hiệu lực trong ngày hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shiftAssignment = await prisma.employeeShift.findFirst({
      where: {
        employeeId,
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!shiftAssignment || !shiftAssignment.shift.isActive) {
      throw new AppError(
        'Bạn chưa được phân ca làm việc hợp lệ cho hôm nay. Vui lòng liên hệ Trưởng phòng hoặc Quản trị viên.',
        400,
        'CHUA_PHAN_CA'
      );
    }
    const shift = shiftAssignment.shift;

    // 3. Lấy văn phòng / địa điểm chấm công có hiệu lực trong ngày
    const locationAssignment = await prisma.employeeLocation.findFirst({
      where: {
        employeeId,
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { location: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!locationAssignment || !locationAssignment.location.isActive) {
      throw new AppError(
        'Bạn chưa được phân bổ văn phòng làm việc. Vui lòng liên hệ phòng Nhân sự.',
        400,
        'CHUA_PHAN_BO_VAN_PHONG'
      );
    }
    const location = locationAssignment.location;

    // 4. Ngăn chặn chấm công trùng lặp trong ngày
    const existingAttendance = await prisma.attendance.findFirst({
      where: { employeeId, workDate: today },
    });
    if (existingAttendance) {
      throw new AppError(
        'Hôm nay bạn đã thực hiện chấm công vào ca rồi. Không thể chấm công lặp lại.',
        409,
        'DA_CHAM_CONG'
      );
    }

    // 5. XÁC THỰC GPS GEOFENCE BẰNG CÔNG THỨC HAVERSINE TRÊN BACKEND
    const { allowed, distance } = isWithinRadius(
      input.latitude,
      input.longitude,
      Number(location.latitude),
      Number(location.longitude),
      location.allowedRadiusMeters
    );

    if (!allowed) {
      throw new AppError(
        `Vị trí của bạn đang ở ngoài khu vực chấm công cho phép! Hiện bạn đang cách ${location.name} khoảng ${distance}m (Bán kính quy định tối đa là ${location.allowedRadiusMeters}m).`,
        400,
        'NGOAI_BAN_KINH_CHO_PHEP'
      );
    }

    // 6. Tính số phút đi trễ (Có xét thời gian ân hạn cấu hình theo ca)
    const now = new Date();
    const lateMinutes = calculateLateMinutes(
      now,
      shift.startTime,
      shift.gracePeriodMinutes,
      today
    );

    // 7. Xác định trạng thái điểm danh ban đầu
    let status: AttendanceStatus = 'PRESENT';
    if (lateMinutes > 0) {
      status = 'LATE';
    }

    // 8. Lưu bản ghi điểm danh
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        shiftId: shift.id,
        locationId: location.id,
        workDate: today,
        checkIn: now,
        checkInLatitude: input.latitude,
        checkInLongitude: input.longitude,
        checkInAccuracy: input.accuracy,
        lateMinutes,
        status,
      },
      include: {
        shift: { select: { name: true, startTime: true, endTime: true } },
        location: { select: { name: true, address: true } },
      },
    });

    // 9. Gửi thông báo hệ thống
    const gioVao = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await prisma.notification.create({
      data: {
        userId,
        title: lateMinutes > 0 ? 'Chấm công vào ca: Đi trễ' : 'Chấm công vào ca: Đúng giờ',
        message:
          lateMinutes > 0
            ? `Bạn đã chấm công vào lúc ${gioVao} — Trễ ${lateMinutes} phút so với thời gian quy định.`
            : `Bạn đã chấm công vào lúc ${gioVao} — Đúng giờ. Chúc bạn một ngày làm việc hiệu quả!`,
        type: lateMinutes > 0 ? 'LATE' : 'CHECK_IN',
      },
    });

    return {
      attendance,
      checkInTime: now,
      lateMinutes,
      status,
      distance,
      workplace: location.name,
      shift: `${shift.startTime} - ${shift.endTime}`,
    };
  }

  /**
   * KẾT THÚC CA LÀM VIỆC (CHECK-OUT)
   * Toàn bộ phép tính được thực hiện trên Backend:
   * - Xác thực GPS có mặt tại văn phòng khi tan ca.
   * - Khấu trừ giờ nghỉ trưa theo ca để ra giờ làm thực tế.
   * - Tính giờ về sớm (Early Leave) và giờ làm thêm (Overtime).
   */
  async checkOut(employeeId: string, userId: string, input: CheckOutInput) {
    // 1. Tìm bản ghi chấm công của ngày hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { employeeId, workDate: today },
      include: {
        shift: true,
        location: true,
      },
    });

    if (!attendance || !attendance.checkIn) {
      throw new AppError(
        'Bạn chưa thực hiện chấm công vào ca cho ngày hôm nay. Vui lòng Check-in trước.',
        400,
        'CHUA_CHECK_IN'
      );
    }

    if (attendance.checkOut) {
      throw new AppError(
        'Bạn đã thực hiện kết thúc ca (Check-out) hôm nay rồi.',
        409,
        'DA_CHECK_OUT'
      );
    }

    // 2. Xác thực GPS Geofence lúc ra về
    const { allowed, distance } = isWithinRadius(
      input.latitude,
      input.longitude,
      Number(attendance.location.latitude),
      Number(attendance.location.longitude),
      attendance.location.allowedRadiusMeters
    );

    if (!allowed) {
      throw new AppError(
        `Vị trí của bạn đang ở ngoài khu vực kết thúc ca! Bạn đang cách ${attendance.location.name} khoảng ${distance}m (Bán kính quy định: ${attendance.location.allowedRadiusMeters}m).`,
        400,
        'NGOAI_BAN_KINH_CHO_PHEP'
      );
    }

    const now = new Date();

    // 3. Tính toán các chỉ số thời gian làm việc thực tế (khấu trừ giờ nghỉ trưa)
    const workingHours = calculateWorkingHours(
      attendance.checkIn,
      now,
      attendance.shift.breakStart,
      attendance.shift.breakEnd,
      today
    );

    const earlyLeaveMinutes = calculateEarlyLeaveMinutes(
      now,
      attendance.shift.endTime,
      today
    );

    const overtimeHours = calculateOvertimeHours(
      now,
      attendance.shift.endTime,
      today
    );

    // 4. Xác định trạng thái tổng kết của ca làm việc
    let status: AttendanceStatus;
    if (attendance.lateMinutes > 0) {
      status = 'LATE'; // Đi trễ là vi phạm chính
    } else if (earlyLeaveMinutes > 0) {
      status = 'EARLY_LEAVE';
    } else if (overtimeHours > 0) {
      status = 'OVERTIME';
    } else {
      status = 'PRESENT';
    }

    // 5. Cập nhật bản ghi chấm công
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        checkOutLatitude: input.latitude,
        checkOutLongitude: input.longitude,
        checkOutAccuracy: input.accuracy,
        workingHours,
        earlyLeaveMinutes,
        overtimeHours,
        status,
      },
      include: {
        shift: { select: { name: true, startTime: true, endTime: true } },
        location: { select: { name: true } },
      },
    });

    // 6. Gửi thông báo hoàn thành ca
    const gioRa = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await prisma.notification.create({
      data: {
        userId,
        title: 'Chấm công kết thúc ca thành công',
        message: `Bạn đã tan ca lúc ${gioRa}. Tổng thời gian làm việc thực tế: ${workingHours.toFixed(2)} giờ${
          overtimeHours > 0 ? `, Tăng ca (OT): ${overtimeHours.toFixed(2)} giờ` : ''
        }.`,
        type: 'CHECK_OUT',
      },
    });

    return {
      attendance: updated,
      checkOutTime: now,
      workingHours,
      earlyLeaveMinutes,
      overtimeHours,
      status,
      distance,
    };
  }

  async getTodayAttendance(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.attendance.findFirst({
      where: { employeeId, workDate: today },
      include: {
        shift: true,
        location: { select: { id: true, name: true, address: true, allowedRadiusMeters: true, latitude: true, longitude: true } },
      },
    });
  }

  async getMyAttendance(employeeId: string, query: AttendanceQueryInput) {
    const { page, limit, startDate, endDate, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = { employeeId };
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate.gte = new Date(startDate);
      if (endDate) where.workDate.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { workDate: sortOrder },
        include: {
          shift: { select: { name: true, startTime: true, endTime: true } },
          location: { select: { name: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllAttendance(
    query: AttendanceQueryInput,
    requestingUserId: string,
    requestingUserRole: string
  ) {
    const {
      page,
      limit,
      employeeId,
      departmentId,
      locationId,
      shiftId,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (locationId) where.locationId = locationId;
    if (shiftId) where.shiftId = shiftId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate.gte = new Date(startDate);
      if (endDate) where.workDate.lte = new Date(endDate);
    }
    if (departmentId) {
      where.employee = { departmentId };
    }

    // Giới hạn phạm vi nghiêm ngặt đối với Trưởng phòng (MANAGER)
    if (requestingUserRole === 'MANAGER') {
      const managerEmployee = await prisma.employee.findFirst({
        where: { userId: requestingUserId },
        select: { departmentId: true },
      });
      if (managerEmployee?.departmentId) {
        where.employee = { ...where.employee, departmentId: managerEmployee.departmentId };
      }
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          employee: {
            select: {
              fullName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          shift: { select: { name: true, startTime: true, endTime: true } },
          location: { select: { name: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
