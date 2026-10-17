import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { format } from 'date-fns';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 30 };
      if (entity) params.entity = entity;
      if (action) params.action = action;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      // Bỏ qua
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entity, action]);

  const getActionBadge = (act: string) => {
    const map: Record<string, { label: string; color: string }> = {
      CREATE: { label: 'THÊM MỚI', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      UPDATE: { label: 'CẬP NHẬT', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      DELETE: { label: 'XÓA / HỦY', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      LOGIN: { label: 'ĐĂNG NHẬP', color: 'bg-sky-50 text-sky-700 border-sky-200' },
      LOGOUT: { label: 'ĐĂNG XUẤT', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      APPROVE: { label: 'PHÊ DUYỆT', color: 'bg-teal-50 text-teal-700 border-teal-200' },
      REJECT: { label: 'TỪ CHỐI', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      ASSIGN: { label: 'PHÂN CÔNG', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const cur = map[act] || { label: act, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cur.color}`}>
        {cur.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Ghi nhận toàn bộ thao tác quản trị, sự kiện đăng nhập và biến động dữ liệu để đảm bảo tính minh bạch
        </p>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Đối tượng tác động (Entity)</label>
          <input
            type="text"
            placeholder="Ví dụ: NhanVien, CaLamViec, DonNghiPhep..."
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Loại hành động</label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">Tất cả hành động</option>
            <option value="CREATE">THÊM MỚI (CREATE)</option>
            <option value="UPDATE">CẬP NHẬT (UPDATE)</option>
            <option value="DELETE">XÓA (DELETE)</option>
            <option value="LOGIN">ĐĂNG NHẬP (LOGIN)</option>
            <option value="LOGOUT">ĐĂNG XUẤT (LOGOUT)</option>
            <option value="APPROVE">PHÊ DUYỆT (APPROVE)</option>
            <option value="REJECT">TỪ CHỐI (REJECT)</option>
            <option value="ASSIGN">PHÂN CÔNG (ASSIGN)</option>
          </select>
        </div>
      </div>

      {/* Bảng Nhật ký kiểm toán */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Đang tải nhật ký kiểm toán..." />
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-medium">Chưa có nhật ký nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">Nội dung chi tiết</th>
                  <th className="py-3 px-4">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {log.user?.email || 'Hệ thống'}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.entity}</td>
                    <td className="py-3 px-4 text-slate-600">{log.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
