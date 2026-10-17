import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreateLocationInput,
  UpdateLocationInput,
  AssignLocationInput,
} from '../validators/location.validator';

export class LocationService {
  async create(input: CreateLocationInput, createdByUserId: string) {
    const location = await prisma.location.create({ data: input });
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: 'CREATE',
        entity: 'DiaDiemVanPhong',
        entityId: location.id,
        newValues: { name: location.name, address: location.address },
        description: `Thêm địa điểm văn phòng chấm công GPS: "${location.name}" (Bán kính: ${location.allowedRadiusMeters}m)`,
      },
    });
    return location;
  }

  async findAll() {
    return prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const loc = await prisma.location.findUnique({ where: { id } });
    if (!loc) throw new AppError('Không tìm thấy địa điểm văn phòng.', 404, 'KHONG_TIM_THAY');
    return loc;
  }

  async update(
    id: string,
    input: UpdateLocationInput,
    updatedByUserId: string
  ) {
    const existing = await this.findById(id);
    const updated = await prisma.location.update({ where: { id }, data: input });
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: 'UPDATE',
        entity: 'DiaDiemVanPhong',
        entityId: id,
        oldValues: { allowedRadiusMeters: existing.allowedRadiusMeters },
        newValues: { allowedRadiusMeters: updated.allowedRadiusMeters },
        description: `Cập nhật cấu hình địa điểm văn phòng "${existing.name}"`,
      },
    });
    return updated;
  }

  async delete(id: string, deletedByUserId: string) {
    const loc = await this.findById(id);
    await prisma.location.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: 'DELETE',
        entity: 'DiaDiemVanPhong',
        entityId: id,
        description: `Vô hiệu hóa địa điểm văn phòng "${loc.name}"`,
      },
    });
  }

  async assignLocation(input: AssignLocationInput, assignedByUserId: string) {
    await prisma.employeeLocation.updateMany({
      where: { employeeId: input.employeeId, isActive: true },
      data: { isActive: false },
    });

    const assignment = await prisma.employeeLocation.create({
      data: {
        employeeId: input.employeeId,
        locationId: input.locationId,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        isActive: true,
      },
      include: {
        location: true,
        employee: { select: { fullName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: assignedByUserId,
        action: 'ASSIGN',
        entity: 'PhanBoVanPhong',
        entityId: assignment.id,
        description: `Phân bổ văn phòng làm việc "${assignment.location.name}" cho nhân viên ${assignment.employee.fullName}`,
      },
    });

    return assignment;
  }

  async getCurrentLocation(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await prisma.employeeLocation.findFirst({
      where: {
        employeeId,
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { location: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    return assignment?.location || null;
  }
}
