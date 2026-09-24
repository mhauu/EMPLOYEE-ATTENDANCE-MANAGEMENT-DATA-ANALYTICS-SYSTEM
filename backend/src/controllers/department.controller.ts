import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/department.validator';
import { sendSuccess, sendCreated } from '../utils/response';

const departmentService = new DepartmentService();

export class DepartmentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createDepartmentSchema.parse(req.body);
      const result = await departmentService.create(parsed, req.user!.id);
      return sendCreated(res, result, 'Department created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await departmentService.findAll();
      return sendSuccess(res, result, 'Departments retrieved');
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await departmentService.findById(req.params.id);
      return sendSuccess(res, result, 'Department details');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateDepartmentSchema.parse(req.body);
      const result = await departmentService.update(req.params.id, parsed, req.user!.id);
      return sendSuccess(res, result, 'Department updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await departmentService.delete(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Department deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
