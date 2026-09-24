import { Request, Response, NextFunction } from 'express';
import { PositionService } from '../services/position.service';
import { createPositionSchema, updatePositionSchema } from '../validators/position.validator';
import { sendSuccess, sendCreated } from '../utils/response';

const positionService = new PositionService();

export class PositionController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createPositionSchema.parse(req.body);
      const result = await positionService.create(parsed, req.user!.id);
      return sendCreated(res, result, 'Position created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await positionService.findAll();
      return sendSuccess(res, result, 'Positions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await positionService.findById(req.params.id);
      return sendSuccess(res, result, 'Position details');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updatePositionSchema.parse(req.body);
      const result = await positionService.update(req.params.id, parsed, req.user!.id);
      return sendSuccess(res, result, 'Position updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await positionService.delete(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Position deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
