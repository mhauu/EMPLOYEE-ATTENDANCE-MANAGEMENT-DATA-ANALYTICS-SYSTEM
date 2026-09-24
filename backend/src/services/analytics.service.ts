import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface DateRange {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
  locationId?: string;
}

export class AnalyticsService {
  /**
   * Admin dashboard summary — real data only, no hardcoded values
   */
  async getDashboardSummary() {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendance.findMany({
        where: { workDate: { gte: todayStart, lte: todayEnd } },
        include: { employee: { select: { department: { select: { name: true } } } } },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const present = todayAttendance.filter((a) =>
      ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(a.status)
    ).length;
    const late = todayAttendance.filter((a) => a.lateMinutes > 0).length;
    const onLeave = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
    const absent = Math.max(0, activeEmployees - present - onLeave);

    const totalWorkingHours = todayAttendance
      .filter((a) => a.checkOut)
      .reduce((sum, a) => sum + Number(a.workingHours), 0);

    const totalOvertimeHours = todayAttendance.reduce(
      (sum, a) => sum + Number(a.overtimeHours),
      0
    );

    return {
      totalEmployees,
      activeEmployees,
      present,
      late,
      absent,
      onLeave,
      pendingLeaves,
      attendanceRate:
        activeEmployees > 0
          ? Math.round((present / activeEmployees) * 1000) / 10
          : 0,
      lateRate:
        present > 0 ? Math.round((late / present) * 1000) / 10 : 0,
      averageWorkingHours:
        present > 0
          ? Math.round((totalWorkingHours / present) * 100) / 100
          : 0,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    };
  }

  /**
   * Attendance trend over the last N days
   */
  async getAttendanceTrend(days = 30, filters: DateRange = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : subDays(endDate, days - 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      workDate: { gte: startDate, lte: endDate },
    };
    if (filters.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }
    if (filters.employeeId) where.employeeId = filters.employeeId;

    const records = await prisma.attendance.groupBy({
      by: ['workDate', 'status'],
      where,
      _count: { status: true },
      orderBy: { workDate: 'asc' },
    });

    // Group by date
    const dateMap: Record<
      string,
      { date: string; present: number; late: number; absent: number; leave: number }
    > = {};

    records.forEach((r) => {
      const dateStr = format(r.workDate, 'yyyy-MM-dd');
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, present: 0, late: 0, absent: 0, leave: 0 };
      }
      if (['PRESENT', 'EARLY_LEAVE', 'OVERTIME'].includes(r.status)) {
        dateMap[dateStr].present += r._count.status;
      } else if (r.status === 'LATE') {
        dateMap[dateStr].late += r._count.status;
        dateMap[dateStr].present += r._count.status; // late = also present
      } else if (r.status === 'ABSENT') {
        dateMap[dateStr].absent += r._count.status;
      } else if (r.status === 'LEAVE') {
        dateMap[dateStr].leave += r._count.status;
      }
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Department-level analytics
   */
  async getDepartmentAnalytics(filters: DateRange = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : subDays(endDate, 29);

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        employees: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            attendances: {
              where: { workDate: { gte: startDate, lte: endDate } },
              select: {
                status: true,
                lateMinutes: true,
                workingHours: true,
                overtimeHours: true,
              },
            },
          },
        },
      },
    });

    return departments.map((dept) => {
      const allAttendance = dept.employees.flatMap((e) => e.attendances);
      const workingDays = allAttendance.length;
      const present = allAttendance.filter((a) =>
        ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(a.status)
      ).length;
      const late = allAttendance.filter((a) => a.lateMinutes > 0).length;
      const absent = allAttendance.filter((a) => a.status === 'ABSENT').length;
      const totalWorkingHours = allAttendance.reduce(
        (sum, a) => sum + Number(a.workingHours),
        0
      );
      const totalOvertimeHours = allAttendance.reduce(
        (sum, a) => sum + Number(a.overtimeHours),
        0
      );

      return {
        id: dept.id,
        name: dept.name,
        employeeCount: dept.employees.length,
        workingDays,
        present,
        late,
        absent,
        attendanceRate: workingDays > 0 ? Math.round((present / workingDays) * 1000) / 10 : 0,
        lateRate: workingDays > 0 ? Math.round((late / workingDays) * 1000) / 10 : 0,
        absenceRate: workingDays > 0 ? Math.round((absent / workingDays) * 1000) / 10 : 0,
        averageWorkingHours:
          present > 0 ? Math.round((totalWorkingHours / present) * 100) / 100 : 0,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      };
    });
  }

  /**
   * Employee analytics for a specific employee and date range
   */
  async getEmployeeAnalytics(employeeId: string, filters: DateRange = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : subDays(endDate, 29);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
      orderBy: { workDate: 'asc' },
    });

    const workingDays = records.length;
    const present = records.filter((r) =>
      ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(r.status)
    ).length;
    const late = records.filter((r) => r.lateMinutes > 0).length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    const totalWorkingHours = records.reduce((sum, r) => sum + Number(r.workingHours), 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtimeHours), 0);
    const totalLateMinutes = records.reduce((sum, r) => sum + r.lateMinutes, 0);

    // Build day-by-day data for charts
    const dailyData = records.map((r) => ({
      date: format(r.workDate, 'yyyy-MM-dd'),
      workingHours: Number(r.workingHours),
      lateMinutes: r.lateMinutes,
      overtimeHours: Number(r.overtimeHours),
      status: r.status,
    }));

    return {
      workingDays,
      present,
      late,
      absent,
      leave,
      attendanceRate: workingDays > 0 ? Math.round((present / workingDays) * 1000) / 10 : 0,
      lateRate: workingDays > 0 ? Math.round((late / workingDays) * 1000) / 10 : 0,
      absenceRate: workingDays > 0 ? Math.round((absent / workingDays) * 1000) / 10 : 0,
      averageWorkingHours: present > 0 ? Math.round((totalWorkingHours / present) * 100) / 100 : 0,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      averageLateMinutes: late > 0 ? Math.round(totalLateMinutes / late) : 0,
      dailyData,
    };
  }

  /**
   * Generate insights from real data
   */
  async getInsights(filters: DateRange = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : subDays(endDate, 29);

    const records = await prisma.attendance.findMany({
      where: {
        workDate: { gte: startDate, lte: endDate },
        ...(filters.departmentId ? { employee: { departmentId: filters.departmentId } } : {}),
      },
      include: {
        employee: { select: { department: { select: { name: true } } } },
      },
    });

    const insights: string[] = [];

    if (records.length === 0) {
      return ['Insufficient data for this analysis.'];
    }

    // Attendance rate insight
    const present = records.filter((r) =>
      ['PRESENT', 'LATE', 'EARLY_LEAVE', 'OVERTIME'].includes(r.status)
    ).length;
    const attendanceRate = Math.round((present / records.length) * 1000) / 10;
    insights.push(`Attendance rate for the selected period is ${attendanceRate}%.`);

    // Late arrivals by day of week
    const lateByDay: Record<string, number> = {
      Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0,
    };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    records.filter((r) => r.lateMinutes > 0).forEach((r) => {
      const day = dayNames[r.workDate.getDay()];
      if (lateByDay[day] !== undefined) lateByDay[day]++;
    });

    const maxLateDay = Object.entries(lateByDay).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: '', count: 0 }
    );
    if (maxLateDay.count > 0) {
      insights.push(
        `${maxLateDay.day} has the highest number of late arrivals (${maxLateDay.count} occurrences).`
      );
    }

    // Average working hours
    const totalWH = records.reduce((sum, r) => sum + Number(r.workingHours), 0);
    const avgWH = present > 0 ? Math.round((totalWH / present) * 100) / 100 : 0;
    if (avgWH > 0) {
      insights.push(`Average working hours per day: ${avgWH} hours.`);
    }

    // Overtime
    const totalOT = records.reduce((sum, r) => sum + Number(r.overtimeHours), 0);
    if (totalOT > 0) {
      insights.push(`Total overtime hours in the period: ${Math.round(totalOT * 100) / 100} hours.`);
    }

    return insights;
  }

  /**
   * Status distribution for pie/donut chart
   */
  async getStatusDistribution(filters: DateRange = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : subDays(endDate, 29);

    const result = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        workDate: { gte: startDate, lte: endDate },
        ...(filters.departmentId ? { employee: { departmentId: filters.departmentId } } : {}),
      },
      _count: { status: true },
    });

    return result.map((r) => ({ status: r.status, count: r._count.status }));
  }
}
