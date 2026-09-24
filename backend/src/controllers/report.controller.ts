import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';

const reportService = new ReportService();

export class ReportController {
  private getFilters(req: Request) {
    return {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      departmentId: req.query.departmentId as string,
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
    };
  }

  async getAttendanceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = this.getFilters(req);
      const data = await reportService.getAttendanceReportData(filters);

      if (req.query.format === 'excel') {
        const buffer = reportService.exportToExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Attendance report data');
    } catch (err) {
      next(err);
    }
  }

  async getLateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = this.getFilters(req);
      const data = await reportService.getLateReportData(filters);

      if (req.query.format === 'excel') {
        const buffer = reportService.exportToExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=late_report.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=late_report.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Late report data');
    } catch (err) {
      next(err);
    }
  }

  async getOvertimeReport(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = this.getFilters(req);
      const data = await reportService.getOvertimeReportData(filters);

      if (req.query.format === 'excel') {
        const buffer = reportService.exportToExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=overtime_report.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=overtime_report.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Overtime report data');
    } catch (err) {
      next(err);
    }
  }

  async getLeaveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = this.getFilters(req);
      const data = await reportService.getLeaveReportData(filters);

      if (req.query.format === 'excel') {
        const buffer = reportService.exportToExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=leave_report.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leave_report.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Leave report data');
    } catch (err) {
      next(err);
    }
  }
}
