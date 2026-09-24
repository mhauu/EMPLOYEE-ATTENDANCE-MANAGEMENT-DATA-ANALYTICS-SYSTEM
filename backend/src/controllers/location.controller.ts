import { Request, Response, NextFunction } from 'express';
import { LocationService } from '../services/location.service';
import { createLocationSchema, updateLocationSchema, assignLocationSchema } from '../validators/location.validator';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/response';

const locationService = new LocationService();

export class LocationController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createLocationSchema.parse(req.body);
      const result = await locationService.create(parsed, req.user!.id);
      return sendCreated(res, result, 'Workplace created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await locationService.findAll();
      return sendSuccess(res, result, 'Workplaces retrieved');
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await locationService.findById(req.params.id);
      return sendSuccess(res, result, 'Workplace details');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateLocationSchema.parse(req.body);
      const result = await locationService.update(req.params.id, parsed, req.user!.id);
      return sendSuccess(res, result, 'Workplace updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await locationService.delete(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Workplace deactivated successfully');
    } catch (err) {
      next(err);
    }
  }

  async assignLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = assignLocationSchema.parse(req.body);
      const result = await locationService.assignLocation(parsed, req.user!.id);
      return sendCreated(res, result, 'Workplace assigned to employee successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMyLocation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const loc = await locationService.getCurrentLocation(req.user.employeeId);
      return sendSuccess(res, loc, 'Current assigned workplace');
    } catch (err) {
      next(err);
    }
  }
}
