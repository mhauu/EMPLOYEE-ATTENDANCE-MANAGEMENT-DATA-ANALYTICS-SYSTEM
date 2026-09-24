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
   * CHECK-IN
   * All business logic is enforced here on the backend:
   * - Employee must be ACTIVE
   * - Must have an active shift
   * - Must have an assigned workplace
   * - Must not already have an attendance record today
   * - GPS must be within allowed radius (calculated server-side)
   * - Late calculation done server-side
   */
  async checkIn(employeeId: string, userId: string, input: CheckInInput) {
    // 1. Verify employee is ACTIVE
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.status !== 'ACTIVE') {
      throw new AppError(
        'Only active employees can check in',
        403,
        'EMPLOYEE_NOT_ACTIVE'
      );
    }

    // 2. Get today's shift
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

    if (!shiftAssignment) {
      throw new AppError(
        'No active shift assignment found. Please contact your manager.',
        400,
        'NO_SHIFT_ASSIGNED'
      );
    }
    const shift = shiftAssignment.shift;

    // 3. Get assigned workplace
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

    if (!locationAssignment) {
      throw new AppError(
        'No workplace assigned. Please contact your manager.',
        400,
        'NO_WORKPLACE_ASSIGNED'
      );
    }
    const location = locationAssignment.location;

    // 4. Prevent duplicate check-in today
    const existingAttendance = await prisma.attendance.findFirst({
      where: { employeeId, workDate: today },
    });
    if (existingAttendance) {
      throw new AppError(
        'You have already checked in today',
        409,
        'ALREADY_CHECKED_IN'
      );
    }

    // 5. GPS VERIFICATION — backend calculates distance, never trusts frontend
    const { allowed, distance } = isWithinRadius(
      input.latitude,
      input.longitude,
      Number(location.latitude),
      Number(location.longitude),
      location.allowedRadiusMeters
    );

    if (!allowed) {
      throw new AppError(
        `Your location is outside the allowed check-in area. You are ${distance}m from ${location.name} (allowed: ${location.allowedRadiusMeters}m).`,
        400,
        'OUTSIDE_ALLOWED_RADIUS'
      );
    }

    // 6. Calculate late minutes — BACKEND ONLY
    const now = new Date();
    const lateMinutes = calculateLateMinutes(
      now,
      shift.startTime,
      shift.gracePeriodMinutes,
      today
    );

    // 7. Determine status
    let status: AttendanceStatus = 'PRESENT';
    if (lateMinutes > 0) {
      status = 'LATE';
    }

    // 8. Create attendance record
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

    // 9. Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: lateMinutes > 0 ? 'Late Check-In' : 'Successful Check-In',
        message:
          lateMinutes > 0
            ? `You checked in at ${now.toLocaleTimeString()} — ${lateMinutes} minutes late`
            : `You checked in at ${now.toLocaleTimeString()} — On time`,
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
   * CHECK-OUT
   * Calculates working hours, overtime, early leave — all server-side.
   */
  async checkOut(employeeId: string, userId: string, input: CheckOutInput) {
    // 1. Find today's active attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { employeeId, workDate: today },
      include: {
        shift: true,
        location: true,
      },
    });

    if (!attendance) {
      throw new AppError(
        'No check-in record found for today. Please check in first.',
        400,
        'NOT_CHECKED_IN'
      );
    }

    if (attendance.checkOut) {
      throw new AppError(
        'You have already checked out today',
        409,
        'ALREADY_CHECKED_OUT'
      );
    }

    if (!attendance.checkIn) {
      throw new AppError('Invalid attendance state', 400, 'INVALID_STATE');
    }

    // 2. GPS VERIFICATION for check-out
    const { allowed, distance } = isWithinRadius(
      input.latitude,
      input.longitude,
      Number(attendance.location.latitude),
      Number(attendance.location.longitude),
      attendance.location.allowedRadiusMeters
    );

    if (!allowed) {
      throw new AppError(
        `Your location is outside the allowed check-out area. You are ${distance}m from ${attendance.location.name}.`,
        400,
        'OUTSIDE_ALLOWED_RADIUS'
      );
    }

    const now = new Date();

    // 3. Calculate working metrics — BACKEND ONLY
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

    // 4. Determine final status
    let status: AttendanceStatus;
    if (attendance.lateMinutes > 0 && earlyLeaveMinutes > 0) {
      status = 'LATE'; // Late takes priority; both conditions present
    } else if (attendance.lateMinutes > 0) {
      status = 'LATE';
    } else if (earlyLeaveMinutes > 0) {
      status = 'EARLY_LEAVE';
    } else if (overtimeHours > 0) {
      status = 'OVERTIME';
    } else {
      status = 'PRESENT';
    }

    // 5. Update attendance record
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

    // 6. Notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Successful Check-Out',
        message: `You checked out at ${now.toLocaleTimeString()}. Working time: ${workingHours.toFixed(2)} hours${overtimeHours > 0 ? `, Overtime: ${overtimeHours.toFixed(2)}h` : ''}`,
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
        location: { select: { id: true, name: true, address: true } },
      },
    });
  }

  async getMyAttendance(employeeId: string, query: AttendanceQueryInput) {
    const { page, limit, startDate, endDate, sortOrder } = query;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { employeeId };
    if (startDate) where.workDate = { ...where.workDate, gte: new Date(startDate) };
    if (endDate) where.workDate = { ...where.workDate, lte: new Date(endDate) };

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Manager scope
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
