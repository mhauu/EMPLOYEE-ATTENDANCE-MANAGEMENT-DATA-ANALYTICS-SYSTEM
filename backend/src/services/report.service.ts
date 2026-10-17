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
  private formatStatusVi(status: string): string {
    switch (status) {
      case 'PRESENT': return 'Đúng giờ';
      case 'LATE': return 'Đi trễ';
      case 'EARLY_LEAVE': return 'Về sớm';
      case 'OVERTIME': return 'Tăng ca (OT)';
      case 'LEAVE': return 'Nghỉ phép có duyệt';
      case 'ABSENT': return 'Vắng không phép';
      default: return status;
    }
  }

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
      title: 'Báo cáo Chi tiết Chấm công Nhân sự',
      generatedAt: new Date().toISOString(),
      filters: filter,
      summary: {
        'Tổng số bản ghi': totalRecords,
        'Số lượt có mặt': presentCount,
        'Số lượt đi trễ': lateCount,
        'Tổng giờ làm việc (giờ)': Math.round(totalWorkingHours * 100) / 100,
        'Tổng giờ tăng ca (giờ)': Math.round(totalOvertimeHours * 100) / 100,
        'Tổng phút đi trễ (phút)': totalLateMinutes,
        'Tỷ lệ chuyên cần (%)': totalRecords > 0 ? `${Math.round((presentCount / totalRecords) * 1000) / 10}%` : '0%',
      },
      records: records.map(r => ({
        'Ngày làm việc': format(r.workDate, 'yyyy-MM-dd'),
        'Mã nhân viên': r.employee.employeeCode,
        'Họ và tên': r.employee.fullName,
        'Phòng ban': r.employee.department?.name || 'Chưa phân bổ',
        'Chức vụ': r.employee.position?.name || 'Nhân viên',
        'Ca làm việc': r.shift.name,
        'Văn phòng': r.location.name,
        'Giờ vào (Check-in)': r.checkIn ? format(r.checkIn, 'HH:mm:ss') : '—',
        'Giờ ra (Check-out)': r.checkOut ? format(r.checkOut, 'HH:mm:ss') : '—',
        'Trạng thái': this.formatStatusVi(r.status),
        'Trễ (phút)': r.lateMinutes,
        'Về sớm (phút)': r.earlyLeaveMinutes,
        'Giờ làm việc': Number(r.workingHours),
        'Giờ tăng ca': Number(r.overtimeHours),
      })),
    };
  }

  async getLateReportData(filter: ReportFilter) {
    const data = await this.getAttendanceReportData(filter);
    const lateRecords = data.records.filter(r => Number(r['Trễ (phút)']) > 0);
    return {
      ...data,
      title: 'Báo cáo Thống kê Đi trễ',
      summary: {
        ...data.summary,
        'Tổng số ca đi trễ': lateRecords.length,
      },
      records: lateRecords,
    };
  }

  async getOvertimeReportData(filter: ReportFilter) {
    const data = await this.getAttendanceReportData(filter);
    const otRecords = data.records.filter(r => Number(r['Giờ tăng ca']) > 0);
    return {
      ...data,
      title: 'Báo cáo Làm thêm giờ (Tăng ca OT)',
      summary: {
        ...data.summary,
        'Số ca có tăng ca': otRecords.length,
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

    const formatLeaveStatusVi = (st: string) => {
      switch (st) {
        case 'APPROVED': return 'Đã phê duyệt';
        case 'PENDING': return 'Chờ phê duyệt';
        case 'REJECTED': return 'Từ chối';
        case 'CANCELLED': return 'Đã hủy';
        default: return st;
      }
    };

    return {
      title: 'Báo cáo Tổng hợp Đơn nghỉ phép',
      generatedAt: new Date().toISOString(),
      filters: filter,
      summary: {
        'Tổng số đơn': requests.length,
        'Đã duyệt': requests.filter(r => r.status === 'APPROVED').length,
        'Chờ duyệt': requests.filter(r => r.status === 'PENDING').length,
        'Từ chối': requests.filter(r => r.status === 'REJECTED').length,
        'Tổng số ngày nghỉ': requests.reduce((sum, r) => sum + Number(r.totalDays), 0),
      },
      records: requests.map(r => ({
        'Mã nhân viên': r.employee.employeeCode,
        'Họ và tên': r.employee.fullName,
        'Phòng ban': r.employee.department?.name || 'Chưa phân bổ',
        'Loại nghỉ phép': r.leaveType.name,
        'Từ ngày': format(r.startDate, 'yyyy-MM-dd'),
        'Đến ngày': format(r.endDate, 'yyyy-MM-dd'),
        'Số ngày xin nghỉ': Number(r.totalDays),
        'Trạng thái': formatLeaveStatusVi(r.status),
        'Lý do nghỉ': r.reason,
        'Người duyệt': r.reviewer?.email || 'Chưa duyệt',
        'Lý do từ chối': r.rejectionReason || '—',
      })),
    };
  }

  exportToExcel(data: { title: string; summary: any; records: any[] }): Buffer {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tóm tắt chỉ số
    const summaryRows = [
      { 'Chỉ tiêu': 'Tiêu đề báo cáo', 'Giá trị': data.title },
      { 'Chỉ tiêu': 'Thời điểm xuất báo cáo', 'Giá trị': new Date().toLocaleString('vi-VN') },
      ...Object.entries(data.summary).map(([k, v]) => ({ 'Chỉ tiêu': k, 'Giá trị': v })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Quan');

    // Sheet 2: Danh sách chi tiết
    const wsDetails = XLSX.utils.json_to_sheet(data.records);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Chi_Tiet');

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

    // Đính kèm UTF-8 BOM (\uFEFF) để Microsoft Excel mở trực tiếp file CSV không bao giờ bị lỗi font tiếng Việt
    return '\uFEFF' + csvRows.join('\n');
  }
}
