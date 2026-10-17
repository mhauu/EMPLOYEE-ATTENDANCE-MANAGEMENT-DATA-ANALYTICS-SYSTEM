import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  Briefcase,
  MapPin,
  CalendarCheck,
  BarChart3,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const getRoleBadge = (r?: string) => {
    switch (r) {
      case 'ADMIN': return 'Quản trị viên';
      case 'MANAGER': return 'Trưởng phòng';
      case 'EMPLOYEE': return 'Nhân viên';
      default: return r;
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Tiêu đề ứng dụng */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200/80">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold mr-3 shadow-md shadow-indigo-200">
          W
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-none">Workforce Hub</h1>
          <span className="text-[10px] text-slate-500 font-medium">Hệ thống Chấm công & Phân tích</span>
        </div>
      </div>

      {/* Danh mục menu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Chức năng chính</p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Bảng điều khiển</span>
            </NavLink>
            <NavLink to="/attendance" className={navItemClass}>
              <Clock className="w-4 h-4" />
              <span>Lịch sử chấm công</span>
            </NavLink>
            <NavLink to="/leaves" className={navItemClass}>
              <CalendarCheck className="w-4 h-4" />
              <span>Đơn nghỉ phép</span>
            </NavLink>
          </nav>
        </div>

        {/* Mục dành cho Quản trị viên và Trưởng phòng */}
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quản trị nhân sự
            </p>
            <nav className="space-y-1">
              <NavLink to="/employees" className={navItemClass}>
                <Users className="w-4 h-4" />
                <span>Nhân sự</span>
              </NavLink>
              {role === 'ADMIN' && (
                <>
                  <NavLink to="/departments" className={navItemClass}>
                    <Building2 className="w-4 h-4" />
                    <span>Phòng ban</span>
                  </NavLink>
                  <NavLink to="/shifts" className={navItemClass}>
                    <Briefcase className="w-4 h-4" />
                    <span>Ca làm việc</span>
                  </NavLink>
                  <NavLink to="/workplaces" className={navItemClass}>
                    <MapPin className="w-4 h-4" />
                    <span>Địa điểm GPS</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        )}

        {/* Phân tích & Báo cáo số liệu */}
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Thống kê & Báo cáo
            </p>
            <nav className="space-y-1">
              <NavLink to="/analytics" className={navItemClass}>
                <BarChart3 className="w-4 h-4" />
                <span>Phân tích số liệu</span>
              </NavLink>
              <NavLink to="/reports" className={navItemClass}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Báo cáo & Xuất file</span>
              </NavLink>
              {role === 'ADMIN' && (
                <NavLink to="/audit-logs" className={navItemClass}>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Nhật ký kiểm toán</span>
                </NavLink>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Thông tin người dùng đăng nhập */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            {user?.fullName ? user.fullName[0].toUpperCase() : user?.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {user?.fullName || user?.email.split('@')[0]}
            </p>
            <span className="inline-block text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {getRoleBadge(role)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
