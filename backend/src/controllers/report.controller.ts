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
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_chi_tiet_cham_cong.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_chi_tiet_cham_cong.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Dữ liệu báo cáo chấm công chi tiết');
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
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_di_tre.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_di_tre.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Dữ liệu báo cáo nhân viên đi trễ');
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
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_tang_ca_ot.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_tang_ca_ot.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Dữ liệu báo cáo làm thêm giờ');
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
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_don_nghi_phep.xlsx');
        return res.send(buffer);
      }

      if (req.query.format === 'csv') {
        const csv = reportService.exportToCsv(data.records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=bao_cao_don_nghi_phep.csv');
        return res.send(csv);
      }

      return sendSuccess(res, data, 'Dữ liệu báo cáo đơn nghỉ phép');
    } catch (err) {
      next(err);
    }
  }
}
