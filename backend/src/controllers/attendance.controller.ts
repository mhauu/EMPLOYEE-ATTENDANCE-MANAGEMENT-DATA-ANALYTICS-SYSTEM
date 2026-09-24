import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import {
  checkInSchema,
  checkOutSchema,
  attendanceQuerySchema,
} from '../validators/attendance.validator';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/response';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendBadRequest(res, 'User has no employee profile');
      }
      const parsed = checkInSchema.parse(req.body);
      const result = await attendanceService.checkIn(
        req.user.employeeId,
        req.user.id,
        parsed
      );
      return sendCreated(res, result, 'Check-in successful');
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendBadRequest(res, 'User has no employee profile');
      }
      const parsed = checkOutSchema.parse(req.body);
      const result = await attendanceService.checkOut(
        req.user.employeeId,
        req.user.id,
        parsed
      );
      return sendSuccess(res, result, 'Check-out successful');
    } catch (err) {
      next(err);
    }
  }

  async getToday(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendBadRequest(res, 'User has no employee profile');
      }
      const result = await attendanceService.getTodayAttendance(req.user.employeeId);
      return sendSuccess(res, result, 'Today attendance record');
    } catch (err) {
      next(err);
    }
  }

  async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendBadRequest(res, 'User has no employee profile');
      }
      const parsed = attendanceQuerySchema.parse(req.query);
      const { data, meta } = await attendanceService.getMyAttendance(
        req.user.employeeId,
        parsed
      );
      return sendSuccess(res, data, 'My attendance records', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getAllAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = attendanceQuerySchema.parse(req.query);
      const { data, meta } = await attendanceService.getAllAttendance(
        parsed,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, data, 'Attendance records', 200, meta);
    } catch (err) {
      next(err);
    }
  }
}
