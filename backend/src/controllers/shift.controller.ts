import { Request, Response, NextFunction } from 'express';
import { ShiftService } from '../services/shift.service';
import { createShiftSchema, updateShiftSchema, assignShiftSchema } from '../validators/shift.validator';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/response';

const shiftService = new ShiftService();

export class ShiftController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createShiftSchema.parse(req.body);
      const result = await shiftService.create(parsed, req.user!.id);
      return sendCreated(res, result, 'Shift created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shiftService.findAll();
      return sendSuccess(res, result, 'Shifts retrieved');
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shiftService.findById(req.params.id);
      return sendSuccess(res, result, 'Shift details');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateShiftSchema.parse(req.body);
      const result = await shiftService.update(req.params.id, parsed, req.user!.id);
      return sendSuccess(res, result, 'Shift updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await shiftService.delete(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Shift deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async assignShift(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = assignShiftSchema.parse(req.body);
      const result = await shiftService.assignShift(parsed, req.user!.id);
      return sendCreated(res, result, 'Shift assigned to employee successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMyShift(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const shift = await shiftService.getCurrentShift(req.user.employeeId);
      return sendSuccess(res, shift, 'Current assigned shift');
    } catch (err) {
      next(err);
    }
  }
}
