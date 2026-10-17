import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Shift, Employee } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Plus, Clock, Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export const ShiftManagementPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal tạo ca làm việc
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    gracePeriodMinutes: 15,
  });

  // Modal phân ca nhân viên
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    shiftId: '',
    effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
  });
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftRes, empRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees?limit=100'),
      ]);
      setShifts(shiftRes.data.data);
      setEmployees(empRes.data.data);
    } catch {
      // Bỏ qua
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shifts', shiftForm);
      setShowCreateModal(false);
      setShiftForm({
        name: '',
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        gracePeriodMinutes: 15,
      });
      setMsg('Tạo ca làm việc mới thành công!');
      setTimeout(() => setMsg(''), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tạo ca làm việc');
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shifts/assign', assignForm);
      setShowAssignModal(false);
      setMsg('Phân ca làm việc cho nhân viên thành công!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phân ca');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản Lý Ca Làm Việc</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Thiết lập khung giờ làm việc, thời gian ân hạn đi trễ và phân bổ lịch làm cho nhân viên
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-500" /> Phân Ca Cho Nhân Viên
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm Ca Làm Mới
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      {/* Lưới hiển thị các ca làm việc */}
      {loading ? (
        <LoadingSpinner text="Đang tải dữ liệu ca làm việc..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-base">{s.name}</span>
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>

              <div className="py-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Khung giờ làm việc:</span>
                  <span className="font-semibold text-slate-800">
                    {s.startTime} — {s.endTime}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Khoảng nghỉ giữa ca:</span>
                  <span className="font-semibold text-slate-800">
                    {s.breakStart || '12:00'} — {s.breakEnd || '13:00'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thời gian ân hạn trễ:</span>
                  <span className="font-semibold text-emerald-600">
                    {s.gracePeriodMinutes} phút
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tạo Ca Làm Việc Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Tạo Ca Làm Việc Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên ca làm việc</label>
                <input
                  type="text"
                  required
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="Ví dụ: Ca Hành Chính Chuẩn"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ bắt đầu (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ kết thúc (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nghỉ trưa từ</label>
                  <input
                    type="time"
                    value={shiftForm.breakStart}
                    onChange={(e) => setShiftForm({ ...shiftForm, breakStart: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nghỉ trưa đến</label>
                  <input
                    type="time"
                    value={shiftForm.breakEnd}
                    onChange={(e) => setShiftForm({ ...shiftForm, breakEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thời gian ân hạn cho phép đi trễ (phút)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={shiftForm.gracePeriodMinutes}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Lưu Ca Làm Việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân Ca Cho Nhân Viên */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Phân Ca Làm Việc Cho Nhân Viên</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignShift} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn nhân viên</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn ca làm việc</label>
                <select
                  required
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Chọn ca làm việc --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Có hiệu lực từ ngày</label>
                <input
                  type="date"
                  required
                  value={assignForm.effectiveFrom}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Xác Nhận Phân Ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
