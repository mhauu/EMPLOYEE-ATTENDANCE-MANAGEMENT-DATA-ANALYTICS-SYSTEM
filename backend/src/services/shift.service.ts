import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateShiftInput,
  UpdateShiftInput,
  AssignShiftInput,
} from '../validators/shift.validator';

export class ShiftService {
  async create(input: CreateShiftInput, createdByUserId: string) {
    const shift = await prisma.shift.create({ data: input });
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'CaLamViec',
        entityId: shift.id,
        newValues: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        },
        description: `Tạo ca làm việc mới: "${shift.name}" (${shift.startTime} - ${shift.endTime})`,
      },
    });
    return shift;
  }

  async findAll() {
    return prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: string) {
    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new AppError('Không tìm thấy ca làm việc.', 404, 'KHONG_TIM_THAY');
    return shift;
  }

  async update(id: string, input: UpdateShiftInput, updatedByUserId: string) {
    const existing = await this.findById(id);
    const updated = await prisma.shift.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'CaLamViec',
        entityId: id,
        oldValues: { name: existing.name, startTime: existing.startTime },
        newValues: { name: updated.name, startTime: updated.startTime },
        description: `Cập nhật ca làm việc "${existing.name}"`,
      },
    });
    return updated;
  }

  async delete(id: string, deletedByUserId: string) {
    const shift = await this.findById(id);
    await prisma.shift.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'CaLamViec',
        entityId: id,
        description: `Vô hiệu hóa ca làm việc "${shift.name}"`,
      },
    });
  }

  async assignShift(input: AssignShiftInput, assignedByUserId: string) {
    // Vô hiệu hóa phân ca cũ có hiệu lực của nhân viên này
    await prisma.employeeShift.updateMany({
      where: { employeeId: input.employeeId, isActive: true },
      data: {
        isActive: false,
        effectiveTo: new Date(input.effectiveFrom),
      },
    });

    const assignment = await prisma.employeeShift.create({
      data: {
        employeeId: input.employeeId,
        shiftId: input.shiftId,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        isActive: true,
      },
      include: {
        shift: true,
        employee: { select: { fullName: true, userId: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: assignedByUserId,
        action: 'ASSIGN',
        entity: 'PhanCaNhanVien',
        entityId: assignment.id,
        newValues: {
          employeeId: input.employeeId,
          shiftId: input.shiftId,
        },
        description: `Phân ca "${assignment.shift.name}" cho nhân viên ${assignment.employee.fullName}`,
      },
    });

    // Tạo thông báo cho nhân viên
    await prisma.notification.create({
      data: {
        userId: assignment.employee.userId,
        title: 'Cập nhật phân ca làm việc mới',
        message: `Bạn đã được phân công ca làm việc mới: "${assignment.shift.name}" (${assignment.shift.startTime} - ${assignment.shift.endTime}) từ ngày ${input.effectiveFrom}.`,
        type: 'SHIFT_ASSIGNED',
      },
    });

    return assignment;
  }

  async getEmployeeShiftHistory(employeeId: string) {
    return prisma.employeeShift.findMany({
      where: { employeeId },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getCurrentShift(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await prisma.employeeShift.findFirst({
      where: {
        employeeId,
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    return assignment?.shift || null;
  }
}
