import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../validators/department.validator';

export class DepartmentService {
  async create(input: CreateDepartmentInput, createdByUserId: string) {
    const existing = await prisma.department.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existing)
      throw new AppError('Department name already exists', 409, 'DEPT_EXISTS');

    const dept = await prisma.department.create({ data: input });
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'Department',
        entityId: dept.id,
        newValues: { name: dept.name },
        description: `Created department ${dept.name}`,
      },
    });
    return dept;
  }

  async findAll() {
    return prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { email: true } },
            position: { select: { name: true } },
          },
        },
        _count: { select: { employees: true } },
      },
    });
    if (!dept) throw new AppError('Department not found', 404, 'NOT_FOUND');
    return dept;
  }

  async update(
    id: string,
    input: UpdateDepartmentInput,
    updatedByUserId: string
  ) {
    const existing = await this.findById(id);
    const updated = await prisma.department.update({
      where: { id },
      data: input,
    });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'Department',
        entityId: id,
        oldValues: { name: existing.name },
        newValues: { name: updated.name },
        description: `Updated department ${existing.name}`,
      },
    });
    return updated;
  }

  async delete(id: string, deletedByUserId: string) {
    const dept = await this.findById(id);
    const empCount = await prisma.employee.count({
      where: { departmentId: id, status: { not: 'TERMINATED' } },
    });
    if (empCount > 0)
      throw new AppError(
        'Cannot delete department with active employees',
        400,
        'DEPT_HAS_EMPLOYEES'
      );

    await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'Department',
        entityId: id,
        description: `Deactivated department ${dept.name}`,
      },
    });
  }
}
