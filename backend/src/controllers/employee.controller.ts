import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
} from '../validators/employee.validator';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/response';

const employeeService = new EmployeeService();

export class EmployeeController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createEmployeeSchema.parse(req.body);
      const result = await employeeService.create(parsed, req.user!.id);
      return sendCreated(res, result, 'Employee created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = employeeQuerySchema.parse(req.query);
      const { data, meta } = await employeeService.findAll(
        parsed,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, data, 'Employees retrieved', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await employeeService.findById(req.params.id);
      return sendSuccess(res, result, 'Employee details');
    } catch (err) {
      next(err);
    }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendBadRequest(res, 'No employee record associated with this account');
      }
      const result = await employeeService.findById(req.user.employeeId);
      return sendSuccess(res, result, 'My employee profile');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateEmployeeSchema.parse(req.body);
      const result = await employeeService.update(req.params.id, parsed, req.user!.id);
      return sendSuccess(res, result, 'Employee updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const targetEmpId = req.params.id || req.user?.employeeId;
      if (!targetEmpId) return sendBadRequest(res, 'Employee ID is required');

      // Authorization guard: normal employee can only see their own summary
      if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== targetEmpId) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied' });
      }

      const summary = await employeeService.getAttendanceSummary(targetEmpId, year, month);
      return sendSuccess(res, summary, 'Employee attendance summary');
    } catch (err) {
      next(err);
    }
  }
}
