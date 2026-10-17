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
    if (existing) {
      throw new AppError('Tên phòng ban này đã tồn tại trong hệ thống.', 409, 'PHONG_BAN_DA_TON_TAI');
    }

    const dept = await prisma.department.create({ data: input });
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'PhongBan',
        entityId: dept.id,
        newValues: { name: dept.name },
        description: `Tạo mới phòng ban "${dept.name}"`,
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
    if (!dept) throw new AppError('Không tìm thấy phòng ban.', 404, 'KHONG_TIM_THAY');
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
        entity: 'PhongBan',
        entityId: id,
        oldValues: { name: existing.name },
        newValues: { name: updated.name },
        description: `Cập nhật thông tin phòng ban "${existing.name}"`,
      },
    });
    return updated;
  }

  async delete(id: string, deletedByUserId: string) {
    const dept = await this.findById(id);
    const empCount = await prisma.employee.count({
      where: { departmentId: id, status: { not: 'TERMINATED' } },
    });
    if (empCount > 0) {
      throw new AppError(
        'Không thể xóa phòng ban đang có nhân viên làm việc. Vui lòng chuyển nhân viên sang phòng ban khác trước.',
        400,
        'PHONG_BAN_CO_NHAN_VIEN'
      );
    }

    await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'PhongBan',
        entityId: id,
        description: `Vô hiệu hóa phòng ban "${dept.name}"`,
      },
    });
  }
}
