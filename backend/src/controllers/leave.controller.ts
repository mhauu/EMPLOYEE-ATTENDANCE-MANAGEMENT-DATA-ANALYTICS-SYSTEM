import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import {
  createLeaveRequestSchema,
  reviewLeaveSchema,
  leaveQuerySchema,
} from '../validators/leave.validator';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/response';

const leaveService = new LeaveService();

export class LeaveController {
  async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await leaveService.getLeaveTypes();
      return sendSuccess(res, types, 'Leave types retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getMyBalances(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const balances = await leaveService.getBalances(req.user.employeeId, year);
      return sendSuccess(res, balances, 'Leave balances');
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const parsed = createLeaveRequestSchema.parse(req.body);
      const result = await leaveService.createRequest(
        req.user.employeeId,
        req.user.id,
        parsed
      );
      return sendCreated(res, result, 'Leave request submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leaveService.approve(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'Leave request approved');
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = reviewLeaveSchema.parse(req.body);
      const result = await leaveService.reject(req.params.id, req.user!.id, parsed);
      return sendSuccess(res, result, 'Leave request rejected');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const result = await leaveService.cancel(req.params.id, req.user.employeeId);
      return sendSuccess(res, result, 'Leave request cancelled');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = leaveQuerySchema.parse(req.query);
      const { data, meta } = await leaveService.findAll(
        parsed,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, data, 'Leave requests', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendBadRequest(res, 'No employee record found');
      const parsed = leaveQuerySchema.parse(req.query);
      parsed.employeeId = req.user.employeeId;
      const { data, meta } = await leaveService.findAll(
        parsed,
        req.user.id,
        req.user.role
      );
      return sendSuccess(res, data, 'My leave requests', 200, meta);
    } catch (err) {
      next(err);
    }
  }
}
