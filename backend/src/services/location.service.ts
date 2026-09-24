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
        entity: 'Location',
        entityId: location.id,
        newValues: { name: location.name, address: location.address },
        description: `Created workplace ${location.name}`,
      },
    });
    return location;
  }

  async findAll() {
    return prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const loc = await prisma.location.findUnique({ where: { id } });
    if (!loc) throw new AppError('Location not found', 404, 'NOT_FOUND');
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
        entity: 'Location',
        entityId: id,
        oldValues: { allowedRadiusMeters: existing.allowedRadiusMeters },
        newValues: { allowedRadiusMeters: updated.allowedRadiusMeters },
        description: `Updated workplace ${existing.name}`,
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
        entity: 'Location',
        entityId: id,
        description: `Deactivated workplace ${loc.name}`,
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
        entity: 'EmployeeLocation',
        entityId: assignment.id,
        description: `Assigned workplace ${assignment.location.name} to ${assignment.employee.fullName}`,
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
