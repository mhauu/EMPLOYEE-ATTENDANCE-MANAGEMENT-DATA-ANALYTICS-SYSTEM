import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreatePositionInput, UpdatePositionInput } from '../validators/position.validator';

export class PositionService {
  async create(input: CreatePositionInput, createdByUserId: string) {
    const position = await prisma.position.create({ data: input });
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'Position',
        entityId: position.id,
        newValues: { name: position.name },
        description: `Created position ${position.name}`,
      },
    });
    return position;
  }

  async findAll() {
    return prisma.position.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            status: true,
          },
        },
      },
    });
    if (!position) throw new AppError('Position not found', 404, 'NOT_FOUND');
    return position;
  }

  async update(id: string, input: UpdatePositionInput, updatedByUserId: string) {
    const existing = await this.findById(id);
    const updated = await prisma.position.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'Position',
        entityId: id,
        oldValues: { name: existing.name },
        newValues: { name: updated.name },
        description: `Updated position ${existing.name}`,
      },
    });
    return updated;
  }

  async delete(id: string, deletedByUserId: string) {
    const position = await this.findById(id);
    const empCount = await prisma.employee.count({
      where: { positionId: id, status: { not: 'TERMINATED' } },
    });
    if (empCount > 0) {
      throw new AppError('Cannot delete position assigned to active employees', 400, 'POSITION_IN_USE');
    }
    await prisma.position.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'Position',
        entityId: id,
        description: `Deactivated position ${position.name}`,
      },
    });
  }
}
