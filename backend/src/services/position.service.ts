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
        entity: 'ChucVu',
        entityId: position.id,
        newValues: { name: position.name },
        description: `Thêm chức vụ mới: "${position.name}"`,
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
    if (!position) throw new AppError('Không tìm thấy chức vụ.', 404, 'KHONG_TIM_THAY');
    return position;
  }

  async update(id: string, input: UpdatePositionInput, updatedByUserId: string) {
    const existing = await this.findById(id);
    const updated = await prisma.position.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'ChucVu',
        entityId: id,
        oldValues: { name: existing.name },
        newValues: { name: updated.name },
        description: `Cập nhật chức vụ "${existing.name}"`,
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
      throw new AppError('Không thể xóa chức vụ đang có nhân viên nắm giữ.', 400, 'CHUC_VU_DANG_SU_DUNG');
    }
    await prisma.position.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'ChucVu',
        entityId: id,
        description: `Vô hiệu hóa chức vụ "${position.name}"`,
      },
    });
  }
}
