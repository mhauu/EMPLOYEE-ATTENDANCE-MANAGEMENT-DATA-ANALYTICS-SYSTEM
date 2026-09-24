import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
  status?: string;
}

export class ReportService {
  async getAttendanceReportData(filter: ReportFilter) {
    const where: any = {};
    if (filter.startDate || filter.endDate) {
      where.workDate = {};
      if (filter.startDate) where.workDate.gte = new Date(filter.startDate);
      if (filter.endDate) where.workDate.lte = new Date(filter.endDate);
    }
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    if (filter.departmentId) {
      where.employee = { departmentId: filter.departmentId };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { workDate: 'desc' },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
        shift: { select: { name: true, startTime: true, endTime: true } },
        location: { select: { name: true } },
      },
    });

    const totalRecords = records.length;
    const presentCount = records.filter(r => ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(r.status)).length;
    const lateCount = records.filter(r => r.lateMinutes > 0).length;
    const totalWorkingHours = records.reduce((sum, r) => sum + Number(r.workingHours), 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtimeHours), 0);
    const totalLateMinutes = records.reduce((sum, r) => sum + r.lateMinutes, 0);

    return {
      title: 'Attendance Detail Report',
      generatedAt: new Date().toISOString(),
      filters: filter,
      summary: {
        totalRecords,
        presentCount,
        lateCount,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalLateMinutes,
        attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 1000) / 10 : 0,
      },
      records: records.map(r => ({
        date: format(r.workDate, 'yyyy-MM-dd'),
        employeeCode: r.employee.employeeCode,
        employeeName: r.employee.fullName,
        department: r.employee.department?.name || 'N/A',
        position: r.employee.position?.name || 'N/A',
        shift: r.shift.name,
        workplace: r.location.name,
        checkIn: r.checkIn ? format(r.checkIn, 'HH:mm:ss') : 'N/A',
        checkOut: r.checkOut ? format(r.checkOut, 'HH:mm:ss') : 'N/A',
        status: r.status,
        lateMinutes: r.lateMinutes,
        earlyLeaveMinutes: r.earlyLeaveMinutes,
        workingHours: Number(r.workingHours),
        overtimeHours: Number(r.overtimeHours),
      })),
    };
  }

  async getLateReportData(filter: ReportFilter) {
    const data = await this.getAttendanceReportData(filter);
    const lateRecords = data.records.filter(r => r.lateMinutes > 0);
    return {
      ...data,
      title: 'Late Arrivals Report',
      summary: {
        ...data.summary,
        totalLateRecords: lateRecords.length,
        averageLateMinutes: lateRecords.length > 0 ? Math.round(data.summary.totalLateMinutes / lateRecords.length) : 0,
      },
      records: lateRecords,
    };
  }

  async getOvertimeReportData(filter: ReportFilter) {
    const data = await this.getAttendanceReportData(filter);
    const otRecords = data.records.filter(r => r.overtimeHours > 0);
    return {
      ...data,
      title: 'Overtime Working Hours Report',
      summary: {
        ...data.summary,
        totalOvertimeRecords: otRecords.length,
      },
      records: otRecords,
    };
  }

  async getLeaveReportData(filter: ReportFilter) {
    const where: any = {};
    if (filter.startDate || filter.endDate) {
      where.startDate = {};
      if (filter.startDate) where.startDate.gte = new Date(filter.startDate);
      if (filter.endDate) where.startDate.lte = new Date(filter.endDate);
    }
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    if (filter.departmentId) {
      where.employee = { departmentId: filter.departmentId };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true, isPaid: true } },
        reviewer: { select: { email: true } },
      },
    });

    return {
      title: 'Leave Requests Report',
      generatedAt: new Date().toISOString(),
      filters: filter,
      summary: {
        totalRequests: requests.length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        pending: requests.filter(r => r.status === 'PENDING').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length,
        totalDays: requests.reduce((sum, r) => sum + Number(r.totalDays), 0),
      },
      records: requests.map(r => ({
        employeeCode: r.employee.employeeCode,
        employeeName: r.employee.fullName,
        department: r.employee.department?.name || 'N/A',
        leaveType: r.leaveType.name,
        startDate: format(r.startDate, 'yyyy-MM-dd'),
        endDate: format(r.endDate, 'yyyy-MM-dd'),
        totalDays: Number(r.totalDays),
        status: r.status,
        reason: r.reason,
        reviewedBy: r.reviewer?.email || 'N/A',
        rejectionReason: r.rejectionReason || '',
      })),
    };
  }

  exportToExcel(data: { title: string; summary: any; records: any[] }): Buffer {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [
      { Metric: 'Report Title', Value: data.title },
      { Metric: 'Generated At', Value: new Date().toISOString() },
      ...Object.entries(data.summary).map(([k, v]) => ({ Metric: k, Value: v })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Details sheet
    const wsDetails = XLSX.utils.json_to_sheet(data.records);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Details');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  exportToCsv(records: any[]): string {
    if (records.length === 0) return '';
    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];

    for (const row of records) {
      const values = headers.map(h => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }
}
