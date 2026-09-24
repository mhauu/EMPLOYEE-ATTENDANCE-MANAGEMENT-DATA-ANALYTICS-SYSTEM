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
        entity: 'Shift',
        entityId: shift.id,
        newValues: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        },
        description: `Created shift ${shift.name}`,
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
    if (!shift) throw new AppError('Shift not found', 404, 'NOT_FOUND');
    return shift;
  }

  async update(id: string, input: UpdateShiftInput, updatedByUserId: string) {
    const existing = await this.findById(id);
    const updated = await prisma.shift.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'Shift',
        entityId: id,
        oldValues: { name: existing.name, startTime: existing.startTime },
        newValues: { name: updated.name, startTime: updated.startTime },
        description: `Updated shift ${existing.name}`,
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
        entity: 'Shift',
        entityId: id,
        description: `Deactivated shift ${shift.name}`,
      },
    });
  }

  async assignShift(input: AssignShiftInput, assignedByUserId: string) {
    // Deactivate existing active assignment
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
        entity: 'EmployeeShift',
        entityId: assignment.id,
        newValues: {
          employeeId: input.employeeId,
          shiftId: input.shiftId,
        },
        description: `Assigned shift ${assignment.shift.name} to ${assignment.employee.fullName}`,
      },
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: assignment.employee.userId,
        title: 'Shift Assignment Updated',
        message: `Your shift has been updated to ${assignment.shift.name} (${assignment.shift.startTime} - ${assignment.shift.endTime})`,
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
