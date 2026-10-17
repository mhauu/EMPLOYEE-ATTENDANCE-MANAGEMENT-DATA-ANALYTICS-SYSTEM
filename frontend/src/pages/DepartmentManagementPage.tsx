import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Department } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Building2, Plus, Users, X, Check } from 'lucide-react';

export const DepartmentManagementPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data);
    } catch {
      // Bỏ qua
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', { name, description });
      setShowModal(false);
      setName('');
      setDescription('');
      setMsg('Tạo mới phòng ban thành công!');
      setTimeout(() => setMsg(''), 4000);
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tạo phòng ban');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản Lý Phòng Ban</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Thiết lập cơ cấu tổ chức doanh nghiệp, các bộ phận và phân bổ nhân sự
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors self-start"
        >
          <Plus className="w-4 h-4" /> Thêm Phòng Ban Mới
        </button>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Đang tải danh sách phòng ban..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-base">{d.name}</span>
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-slate-500 py-3 min-h-[44px]">
                {d.description || 'Chưa có mô tả chi tiết nhiệm vụ.'}
              </p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Số lượng nhân sự:
                </span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                  {d._count?.employees || 0} người
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Thêm Phòng Ban Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên phòng ban</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Phòng Kiểm Thử Chất Lượng (QA)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả chức năng</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chức năng, nhiệm vụ và phạm vi hoạt động..."
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
                  Lưu Phòng Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
