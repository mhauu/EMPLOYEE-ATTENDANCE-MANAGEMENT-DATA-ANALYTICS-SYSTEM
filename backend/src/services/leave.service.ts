import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateLeaveRequestInput,
  ReviewLeaveInput,
  LeaveQueryInput,
} from '../validators/leave.validator';
import { differenceInBusinessDays, addDays } from 'date-fns';

function countBusinessDays(start: Date, end: Date): number {
  // Simple business day counter (Mon-Fri)
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
      throw new AppError('Leave dates must include at least 1 working day', 400, 'INVALID_DATES');
    }

    // Check leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: input.leaveTypeId },
    });
    if (!leaveType) {
      throw new AppError('Invalid leave type', 404, 'NOT_FOUND');
    }

    // Check for overlapping requests
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
        'You have an existing leave request that overlaps with these dates',
        409,
        'LEAVE_OVERLAP'
      );
    }

    // Check balance if applicable
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
        `Insufficient leave balance. Available: ${availableDays} days, Requested: ${totalDays} days`,
        400,
        'INSUFFICIENT_BALANCE'
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

      // Update pending days in balance
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: { increment: totalDays } },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          title: 'Leave Request Submitted',
          message: `Your ${leaveType.name} leave request for ${totalDays} day(s) has been submitted for review.`,
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
        employee: { include: { user: true } },
        leaveType: true,
      },
    });

    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be approved', 400, 'INVALID_STATUS');
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      // Update leave balance: move from pending to used
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

      await tx.auditLog.create({
        data: {
          userId: reviewerUserId,
          action: 'APPROVE',
          entity: 'LeaveRequest',
          entityId: requestId,
          description: `Approved leave request for ${request.employee.fullName}`,
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: request.employee.userId,
          title: 'Leave Request Approved',
          message: `Your ${request.leaveType.name} leave request has been approved.`,
          type: 'LEAVE_APPROVED',
        },
      });
    });

    return { message: 'Leave request approved successfully' };
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

    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be rejected', 400, 'INVALID_STATUS');
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

      // Return pending days to balance
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
          entity: 'LeaveRequest',
          entityId: requestId,
          description: `Rejected leave request for ${request.employee.fullName}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.employee.userId,
          title: 'Leave Request Rejected',
          message: `Your ${request.leaveType.name} leave request has been rejected.${input.rejectionReason ? ` Reason: ${input.rejectionReason}` : ''}`,
          type: 'LEAVE_REJECTED',
        },
      });
    });

    return { message: 'Leave request rejected' };
  }

  async cancel(requestId: string, employeeId: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (request.employeeId !== employeeId) {
      throw new AppError('You can only cancel your own leave requests', 403, 'FORBIDDEN');
    }
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be cancelled', 400, 'INVALID_STATUS');
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      // Return pending days
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

    return { message: 'Leave request cancelled' };
  }

  async findAll(query: LeaveQueryInput, requestingUserId: string, role: string) {
    const { page, limit, employeeId, leaveTypeId, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    // Manager scope
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
