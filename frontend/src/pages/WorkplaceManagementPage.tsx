import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Workplace, Employee } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Plus, MapPin, Compass, Check, X, Shield, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const WorkplaceManagementPage: React.FC = () => {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal tạo địa điểm
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workplaceForm, setWorkplaceForm] = useState({
    name: '',
    address: '',
    latitude: 10.776889,
    longitude: 106.700806,
    allowedRadiusMeters: 100,
  });

  // Modal phân bổ địa điểm cho nhân viên
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    locationId: '',
    effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
  });
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [locRes, empRes] = await Promise.all([
        api.get('/locations'),
        api.get('/employees?limit=100'),
      ]);
      setWorkplaces(locRes.data.data);
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

  const handleCreateWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations', workplaceForm);
      setShowCreateModal(false);
      setWorkplaceForm({
        name: '',
        address: '',
        latitude: 10.776889,
        longitude: 106.700806,
        allowedRadiusMeters: 100,
      });
      setMsg('Tạo địa điểm văn phòng thành công!');
      setTimeout(() => setMsg(''), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tạo địa điểm văn phòng');
    }
  };

  const handleAssignWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/assign', assignForm);
      setShowAssignModal(false);
      setMsg('Phân bổ văn phòng làm việc cho nhân viên thành công!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phân bổ văn phòng');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkplaceForm({
          ...workplaceForm,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        });
      },
      () => alert('Không thể lấy tọa độ GPS hiện tại của thiết bị')
    );
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản Lý Địa Điểm Chấm Công (GPS Geofencing)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cấu hình tọa độ văn phòng, bán kính cho phép và phân bổ nơi làm việc cho nhân viên
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-500" /> Phân Bổ Văn Phòng Cho Nhân Viên
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm Văn Phòng Mới
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      {/* Thông tin giải thích cơ chế Geofencing */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Cơ Chế Xác Thực Bán Kính Geofencing Trên Máy Chủ (Server-Side)</p>
          <p className="text-indigo-700 mt-0.5 leading-relaxed">
            Hệ thống không dùng mã QR để tránh chia sẻ giả mạo. Khi nhân viên nhấn chấm công, tọa độ GPS được gửi lên máy chủ. Backend áp dụng công thức khoảng cách hình cầu Haversine để so khớp với tọa độ văn phòng được phân công. Nếu khoảng cách vượt quá bán kính quy định, yêu cầu sẽ bị từ chối ngay lập tức.
          </p>
        </div>
      </div>

      {/* Lưới danh sách các địa điểm */}
      {loading ? (
        <LoadingSpinner text="Đang tải danh sách địa điểm..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workplaces.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-base">{w.name}</span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </span>
              </div>

              <div className="py-4 space-y-2.5 text-xs text-slate-600">
                <p className="line-clamp-2 text-slate-500">{w.address}</p>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vĩ độ (Latitude):</span>
                    <span className="font-semibold text-slate-800">{Number(w.latitude).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kinh độ (Longitude):</span>
                    <span className="font-semibold text-slate-800">{Number(w.longitude).toFixed(6)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span>Bán kính cho phép:</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                    {w.allowedRadiusMeters} mét
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Văn Phòng Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Thêm Văn Phòng Chấm Công Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkplace} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên văn phòng / Địa điểm</label>
                <input
                  type="text"
                  required
                  value={workplaceForm.name}
                  onChange={(e) => setWorkplaceForm({ ...workplaceForm, name: e.target.value })}
                  placeholder="Ví dụ: Trụ sở chính TP. Hồ Chí Minh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  required
                  value={workplaceForm.address}
                  onChange={(e) => setWorkplaceForm({ ...workplaceForm, address: e.target.value })}
                  placeholder="72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-slate-700">Tọa độ GPS Geofence</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" /> Lấy tọa độ vị trí hiện tại
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Vĩ độ (Latitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={workplaceForm.latitude}
                    onChange={(e) =>
                      setWorkplaceForm({ ...workplaceForm, latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={workplaceForm.longitude}
                    onChange={(e) =>
                      setWorkplaceForm({ ...workplaceForm, longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bán kính cho phép điểm danh (mét)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  required
                  value={workplaceForm.allowedRadiusMeters}
                  onChange={(e) =>
                    setWorkplaceForm({
                      ...workplaceForm,
                      allowedRadiusMeters: parseInt(e.target.value) || 100,
                    })
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
                  Lưu Địa Điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân Bổ Văn Phòng Cho Nhân Viên */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Phân Bổ Văn Phòng Cho Nhân Viên</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignWorkplace} className="space-y-3 mt-4 text-xs">
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
                <label className="block font-semibold text-slate-700 mb-1">Chọn văn phòng làm việc</label>
                <select
                  required
                  value={assignForm.locationId}
                  onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Chọn văn phòng --</option>
                  {workplaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Bán kính: {w.allowedRadiusMeters}m)
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
                  Xác Nhận Phân Bổ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
