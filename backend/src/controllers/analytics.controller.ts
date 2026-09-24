import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await analyticsService.getDashboardSummary();
      return sendSuccess(res, summary, 'Dashboard summary metrics');
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        departmentId: req.query.departmentId as string,
        employeeId: req.query.employeeId as string,
      };
      const trend = await analyticsService.getAttendanceTrend(days, filters);
      return sendSuccess(res, trend, 'Attendance trend data');
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      const data = await analyticsService.getDepartmentAnalytics(filters);
      return sendSuccess(res, data, 'Department analytics');
    } catch (err) {
      next(err);
    }
  }

  async getEmployeeAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const empId = req.params.id || req.user?.employeeId;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Employee ID required' });
      }
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      const data = await analyticsService.getEmployeeAnalytics(empId, filters);
      return sendSuccess(res, data, 'Employee analytics');
    } catch (err) {
      next(err);
    }
  }

  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        departmentId: req.query.departmentId as string,
      };
      const insights = await analyticsService.getInsights(filters);
      return sendSuccess(res, insights, 'Data-driven insights');
    } catch (err) {
      next(err);
    }
  }

  async getStatusDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        departmentId: req.query.departmentId as string,
      };
      const distribution = await analyticsService.getStatusDistribution(filters);
      return sendSuccess(res, distribution, 'Attendance status distribution');
    } catch (err) {
      next(err);
    }
  }
}
