import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import { AttendanceRecord, Department } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const endpoint = isEmployee ? '/attendance/my' : '/attendance';
      const params: any = { page, limit: 15 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentId) params.departmentId = departmentId;
      if (status) params.status = status;

      const res = await api.get(endpoint, { params });
      setRecords(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (!isEmployee) {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data);
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [page, startDate, endDate, departmentId, status]);

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Date', 'Employee Code', 'Employee Name', 'Department', 'Shift', 'Workplace', 'Check-in', 'Check-out', 'Late (min)', 'Working (hr)', 'OT (hr)', 'Status'];
    const rows = records.map((r) => [
      format(new Date(r.workDate), 'yyyy-MM-dd'),
      r.employee?.employeeCode || '',
      r.employee?.fullName || user?.fullName || '',
      r.employee?.department?.name || '',
      r.shift?.name || '',
      r.location?.name || '',
      r.checkIn ? format(new Date(r.checkIn), 'HH:mm:ss') : 'N/A',
      r.checkOut ? format(new Date(r.checkOut), 'HH:mm:ss') : 'N/A',
      r.lateMinutes,
      r.workingHours,
      r.overtimeHours,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isEmployee ? 'My Attendance History' : 'Employee Attendance Logs'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verified workplace GPS attendance records and working hour breakdowns
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start"
        >
          <Download className="w-4 h-4 text-slate-500" /> Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {!isEmployee && (
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">On Time (Present)</option>
            <option value="LATE">Late Arrival</option>
            <option value="EARLY_LEAVE">Early Leave</option>
            <option value="OVERTIME">Overtime</option>
            <option value="LEAVE">On Leave</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Retrieving attendance records..." />
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No attendance records found for this period.</p>
            <p className="text-xs text-slate-600 mt-0.5">Try adjusting your filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  {!isEmployee && <th className="py-3.5 px-4">Employee</th>}
                  {!isEmployee && <th className="py-3.5 px-4">Department</th>}
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Workplace</th>
                  <th className="py-3.5 px-4">Check In</th>
                  <th className="py-3.5 px-4">Check Out</th>
                  <th className="py-3.5 px-4">Late</th>
                  <th className="py-3.5 px-4">Working</th>
                  <th className="py-3.5 px-4">Overtime</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {format(new Date(r.workDate), 'yyyy-MM-dd')}
                    </td>
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {r.employee?.fullName}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {r.employee?.employeeCode}
                        </span>
                      </td>
                    )}
                    {!isEmployee && (
                      <td className="py-3 px-4 text-slate-600">
                        {r.employee?.department?.name || 'N/A'}
                      </td>
                    )}
                    <td className="py-3 px-4">{r.shift?.name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.location?.name}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {r.checkIn ? format(new Date(r.checkIn), 'HH:mm:ss') : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {r.checkOut ? format(new Date(r.checkOut), 'HH:mm:ss') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.lateMinutes > 0 ? (
                        <span className="font-semibold text-amber-600">+{r.lateMinutes}m</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {r.workingHours > 0 ? `${r.workingHours}h` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.overtimeHours > 0 ? (
                        <span className="font-semibold text-indigo-600">+{r.overtimeHours}h</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page {meta.page} of {meta.totalPages} ({meta.total} records total)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
