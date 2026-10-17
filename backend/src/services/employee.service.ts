import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthService } from './auth.service';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQueryInput,
} from '../validators/employee.validator';
import { UserRole } from '@prisma/client';

async function generateEmployeeCode(): Promise<string> {
  const count = await prisma.employee.count();
  const num = count + 1;
  return `NV${String(num).padStart(4, '0')}`;
}

export class EmployeeService {
  async create(input: CreateEmployeeInput, createdByUserId: string) {
    // Kiểm tra tính duy nhất của email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError('Email này đã được đăng ký trong hệ thống.', 409, 'EMAIL_DA_TON_TAI');
    }

    const passwordHash = await AuthService.hashPassword(input.password);
    const employeeCode = await generateEmployeeCode();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: UserRole.EMPLOYEE,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          fullName: input.fullName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          gender: input.gender,
          departmentId: input.departmentId,
          positionId: input.positionId,
          hireDate: new Date(input.hireDate),
          employmentType: input.employmentType || 'FULL_TIME',
          status: input.status || 'ACTIVE',
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      // Tự động khởi tạo quỹ nghỉ phép năm cho nhân viên mới
      const leaveTypes = await tx.leaveType.findMany({ where: { isActive: true } });
      const year = new Date().getFullYear();
      await tx.leaveBalance.createMany({
        data: leaveTypes.map((lt) => ({
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year,
          totalDays: lt.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
        })),
      });

      // Ghi nhật ký kiểm toán
      await tx.auditLog.create({
        data: {
          userId: createdByUserId,
          action: 'CREATE',
          entity: 'NhanVien',
          entityId: employee.id,
          newValues: { employeeCode, email: input.email, fullName: input.fullName },
          description: `Thêm mới nhân viên ${input.fullName} (${employeeCode})`,
        },
      });

      return employee;
    });

    return result;
  }

  async findAll(
    query: EmployeeQueryInput,
    requestingUserId: string,
    requestingUserRole: string
  ) {
    const { page, limit, search, departmentId, positionId, status, sortBy, sortOrder } =
      query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;
    if (status) where.status = status;

    // Phân quyền: Trưởng phòng chỉ quản lý nhân viên thuộc phòng ban mình
    if (requestingUserRole === 'MANAGER') {
      const managerEmployee = await prisma.employee.findFirst({
        where: { userId: requestingUserId },
        select: { departmentId: true },
      });
      if (managerEmployee?.departmentId) {
        where.departmentId = managerEmployee.departmentId;
      }
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, email: true, role: true, lastLoginAt: true },
          },
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, lastLoginAt: true } },
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        shiftAssignments: {
          where: { isActive: true },
          include: { shift: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        locationAssignments: {
          where: { isActive: true },
          include: { location: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });
    if (!employee) throw new AppError('Không tìm thấy nhân viên.', 404, 'KHONG_TIM_THAY');
    return employee;
  }

  async findByUserId(userId: string) {
    return prisma.employee.findFirst({
      where: { userId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        shiftAssignments: {
          where: { isActive: true },
          include: { shift: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        locationAssignments: {
          where: { isActive: true },
          include: { location: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });
  }

  async update(id: string, input: UpdateEmployeeInput, updatedByUserId: string) {
    const existing = await this.findById(id);

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          gender: input.gender,
          departmentId: input.departmentId,
          positionId: input.positionId,
          hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
          employmentType: input.employmentType,
          status: input.status,
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: updatedByUserId,
          action: 'UPDATE',
          entity: 'NhanVien',
          entityId: id,
          oldValues: {
            fullName: existing.fullName,
            status: existing.status,
            departmentId: existing.departmentId,
          },
          newValues: {
            fullName: input.fullName,
            status: input.status,
            departmentId: input.departmentId,
          },
          description: `Cập nhật thông tin nhân viên ${existing.fullName}`,
        },
      });

      return emp;
    });

    return updated;
  }

  async getAttendanceSummary(
    employeeId: string,
    year: number,
    month: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
      include: {
        shift: { select: { name: true, startTime: true, endTime: true } },
        location: { select: { name: true } },
      },
      orderBy: { workDate: 'asc' },
    });

    const present = records.filter((r) =>
      ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(r.status)
    ).length;
    const late = records.filter((r) => r.lateMinutes > 0).length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    const totalWorkingHours = records.reduce(
      (sum, r) => sum + Number(r.workingHours),
      0
    );
    const totalOvertimeHours = records.reduce(
      (sum, r) => sum + Number(r.overtimeHours),
      0
    );
    const totalLateMinutes = records.reduce((sum, r) => sum + r.lateMinutes, 0);
    const workingDays = records.length;

    return {
      workingDays,
      present,
      late,
      absent,
      leave,
      attendanceRate:
        workingDays > 0 ? Math.round((present / workingDays) * 1000) / 10 : 0,
      lateRate:
        workingDays > 0 ? Math.round((late / workingDays) * 1000) / 10 : 0,
      averageWorkingHours:
        present > 0 ? Math.round((totalWorkingHours / present) * 100) / 100 : 0,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      averageLateMinutes: late > 0 ? Math.round(totalLateMinutes / late) : 0,
      records,
    };
  }
}
