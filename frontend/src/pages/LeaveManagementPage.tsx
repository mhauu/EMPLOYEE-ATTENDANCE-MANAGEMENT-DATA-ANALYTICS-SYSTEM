import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import { LeaveRequest, LeaveBalance } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CalendarCheck, Plus, Check, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export const LeaveManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nộp đơn xin nghỉ phép
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal từ chối đơn
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [typeRes, reqRes] = await Promise.all([
        api.get('/leaves/types'),
        api.get(isEmployee ? '/leaves/my' : '/leaves'),
      ]);
      setLeaveTypes(typeRes.data.data);
      setRequests(reqRes.data.data);

      if (isEmployee) {
        const balRes = await api.get('/leaves/my/balances');
        setBalances(balRes.data.data);
      }
    } catch {
      // Bỏ qua
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/leaves', form);
      setShowModal(false);
      setForm({
        leaveTypeId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
      setSuccessMsg('Nộp đơn xin nghỉ phép thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể gửi đơn xin nghỉ phép');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/leaves/${id}/approve`);
      setSuccessMsg('Đã phê duyệt đơn nghỉ phép thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phê duyệt đơn');
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await api.put(`/leaves/${rejectingId}/reject`, { rejectionReason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      setSuccessMsg('Đã từ chối đơn nghỉ phép!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi từ chối đơn');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn xin nghỉ phép đang chờ duyệt này?')) return;
    try {
      await api.put(`/leaves/${id}/cancel`);
      setSuccessMsg('Đã hủy đơn xin nghỉ phép thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi hủy đơn');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản Lý Đơn Nghỉ Phép</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEmployee
              ? 'Tạo đơn xin nghỉ phép và theo dõi quỹ ngày phép còn lại trong năm'
              : 'Tiếp nhận, xét duyệt và quản lý các yêu cầu nghỉ phép của nhân sự'}
          </p>
        </div>

        {isEmployee && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors self-start"
          >
            <Plus className="w-4 h-4" /> Tạo Đơn Xin Nghỉ Phép
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Thẻ Quỹ Phép Năm Dành Cho Nhân Viên */}
      {isEmployee && balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balances.map((b) => {
            const available = b.totalDays - Number(b.usedDays) - Number(b.pendingDays);
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {b.leaveType.name}
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{available}</span>
                  <span className="text-xs text-slate-500">ngày còn lại</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>Đã dùng: {b.usedDays} ngày</span>
                  <span>Chờ duyệt: {b.pendingDays} ngày</span>
                  <span>Tiêu chuẩn: {b.totalDays} ngày</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bảng Danh Sách Đơn Xin Nghỉ Phép */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            {isEmployee ? 'Lịch Sử Đơn Nghỉ Phép Của Tôi' : 'Danh Sách Yêu Cầu Nghỉ Phép Toàn Đơn Vị'}
          </h3>
        </div>

        {loading ? (
          <LoadingSpinner text="Đang tải danh sách đơn nghỉ phép..." />
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Chưa có đơn xin nghỉ phép nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold tracking-wider">
                <tr>
                  {!isEmployee && <th className="py-3.5 px-4">Nhân viên</th>}
                  {!isEmployee && <th className="py-3.5 px-4">Phòng ban</th>}
                  <th className="py-3.5 px-4">Loại nghỉ phép</th>
                  <th className="py-3.5 px-4">Khoảng thời gian</th>
                  <th className="py-3.5 px-4">Số ngày</th>
                  <th className="py-3.5 px-4">Lý do nghỉ</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    {!isEmployee && (
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {r.employee?.fullName}
                        <span className="block text-[10px] text-slate-400">
                          {r.employee?.employeeCode}
                        </span>
                      </td>
                    )}
                    {!isEmployee && (
                      <td className="py-3 px-4 text-slate-600">
                        {r.employee?.department?.name || '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.leaveType?.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {format(new Date(r.startDate), 'yyyy-MM-dd')} →{' '}
                      {format(new Date(r.endDate), 'yyyy-MM-dd')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.totalDays} ngày</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Nhân viên hủy đơn đang chờ duyệt */}
                      {isEmployee && r.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded font-medium"
                        >
                          Hủy đơn
                        </button>
                      )}

                      {/* Quản lý duyệt / từ chối */}
                      {!isEmployee && r.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Phê duyệt đơn này"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectingId(r.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Từ chối đơn này"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nộp Đơn Nghỉ Phép */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Tạo Đơn Xin Nghỉ Phép</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại nghỉ phép</label>
                <select
                  required
                  value={form.leaveTypeId}
                  onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Chọn loại nghỉ phép --</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isPaid ? '(Hưởng nguyên lương)' : '(Không hưởng lương)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do xin nghỉ</label>
                <textarea
                  rows={3}
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ghi rõ lý do xin nghỉ phép..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Gửi Đơn Xin Nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nhập Lý Do Từ Chối */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-800">Từ Chối Đơn Nghỉ Phép</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng cung cấp lý do từ chối để phản hồi cho nhân viên:</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Trùng thời điểm bàn giao dự án quan trọng..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs mt-3"
            />
            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
