import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import { AttendanceRecord, Department } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
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
      // Bỏ qua
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
        // Bỏ qua
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
    const headers = ['Ngày', 'Mã nhân viên', 'Họ và tên', 'Phòng ban', 'Ca làm việc', 'Văn phòng', 'Giờ vào', 'Giờ ra', 'Trễ (phút)', 'Về sớm (phút)', 'Giờ làm (h)', 'Tăng ca (h)', 'Trạng thái'];
    const rows = records.map((r) => [
      format(new Date(r.workDate), 'yyyy-MM-dd'),
      r.employee?.employeeCode || '',
      r.employee?.fullName || user?.fullName || '',
      r.employee?.department?.name || '',
      r.shift?.name || '',
      r.location?.name || '',
      r.checkIn ? format(new Date(r.checkIn), 'HH:mm:ss') : '—',
      r.checkOut ? format(new Date(r.checkOut), 'HH:mm:ss') : '—',
      r.lateMinutes,
      r.earlyLeaveMinutes,
      r.workingHours,
      r.overtimeHours,
      r.status,
    ]);

    // Thêm ký tự UTF-8 BOM (\uFEFF) để file mở trong Microsoft Excel có đầy đủ dấu tiếng Việt chuẩn
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lich_su_cham_cong_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isEmployee ? 'Lịch Sử Chấm Công Của Tôi' : 'Quản Lý Nhật Ký Chấm Công Nhân Sự'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Dữ liệu xác thực GPS geofence, thời gian làm việc thực tế và chi tiết giờ vào ra
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start"
        >
          <Download className="w-4 h-4 text-slate-500" /> Xuất file CSV
        </button>
      </div>

      {/* Thanh công cụ lọc */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Từ ngày</label>
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
          <label className="block font-semibold text-slate-600 mb-1">Đến ngày</label>
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
            <label className="block font-semibold text-slate-600 mb-1">Phòng ban</label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-600 mb-1">Trạng thái điểm danh</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PRESENT">Đúng giờ</option>
            <option value="LATE">Đi trễ</option>
            <option value="EARLY_LEAVE">Về sớm</option>
            <option value="OVERTIME">Tăng ca (OT)</option>
            <option value="LEAVE">Nghỉ phép</option>
            <option value="ABSENT">Vắng mặt</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu chấm công */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Đang tải dữ liệu chấm công..." />
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Không tìm thấy bản ghi chấm công nào phù hợp.</p>
            <p className="text-xs text-slate-400 mt-0.5">Vui lòng điều chỉnh lại khoảng ngày hoặc bộ lọc phía trên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ngày</th>
                  {!isEmployee && <th className="py-3.5 px-4">Nhân viên</th>}
                  {!isEmployee && <th className="py-3.5 px-4">Phòng ban</th>}
                  <th className="py-3.5 px-4">Ca làm việc</th>
                  <th className="py-3.5 px-4">Văn phòng</th>
                  <th className="py-3.5 px-4">Giờ vào</th>
                  <th className="py-3.5 px-4">Giờ ra</th>
                  <th className="py-3.5 px-4">Đi trễ</th>
                  <th className="py-3.5 px-4">Giờ làm</th>
                  <th className="py-3.5 px-4">Tăng ca</th>
                  <th className="py-3.5 px-4 text-right">Trạng thái</th>
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
                        <span className="text-[10px] text-slate-400">
                          {r.employee?.employeeCode}
                        </span>
                      </td>
                    )}
                    {!isEmployee && (
                      <td className="py-3 px-4 text-slate-600">
                        {r.employee?.department?.name || '—'}
                      </td>
                    )}
                    <td className="py-3 px-4">{r.shift?.name}</td>
                    <td className="py-3 px-4 text-slate-500">{r.location?.name}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {r.checkIn ? format(new Date(r.checkIn), 'HH:mm:ss') : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {r.checkOut ? format(new Date(r.checkOut), 'HH:mm:ss') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.lateMinutes > 0 ? (
                        <span className="font-semibold text-amber-600">+{r.lateMinutes}p</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {r.workingHours > 0 ? `${r.workingHours}h` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.overtimeHours > 0 ? (
                        <span className="font-semibold text-indigo-600">+{r.overtimeHours}h</span>
                      ) : (
                        <span className="text-slate-400">0</span>
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

        {/* Thanh phân trang */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Đang hiển thị trang {meta.page} trên tổng số {meta.totalPages} ({meta.total} kết quả)
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
