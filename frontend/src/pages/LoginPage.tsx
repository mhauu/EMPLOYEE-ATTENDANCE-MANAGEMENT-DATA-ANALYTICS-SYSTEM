import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Clock, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản.');
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-200">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Hệ Thống Chấm Công</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập bằng tài khoản doanh nghiệp của bạn</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten.nhanvien@company.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Nút đăng nhập nhanh dành cho buổi trình chiếu đồ án */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Tài khoản kiểm thử nhanh (1-Click)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@company.com', 'Admin@123')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded border border-slate-200 text-left transition-colors truncate"
            >
              <span className="font-semibold block">Quản trị viên (Admin)</span>
              <span className="text-[10px] text-slate-400">Toàn quyền hệ thống</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager.it@company.com', 'Manager@123')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded border border-slate-200 text-left transition-colors truncate"
            >
              <span className="font-semibold block">Trưởng phòng IT</span>
              <span className="text-[10px] text-slate-400">Theo phòng ban</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('emp001@company.com', 'Employee@123')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded border border-slate-200 text-left transition-colors truncate"
            >
              <span className="font-semibold block">Nhân viên 1 (Lê H. Nam)</span>
              <span className="text-[10px] text-slate-400">CSC.ĐHSG</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('emp004@company.com', 'Employee@123')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded border border-slate-200 text-left transition-colors truncate"
            >
              <span className="font-semibold block">Nhân viên 4 (Đỗ T. Lan)</span>
              <span className="text-[10px] text-slate-400">CS1.ĐHSG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
