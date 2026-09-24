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

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200/80">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold mr-3 shadow-md shadow-indigo-200">
          W
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-none">Workforce Hub</h1>
          <span className="text-[10px] text-slate-600 font-medium">Attendance & Analytics</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Main</p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/attendance" className={navItemClass}>
              <Clock className="w-4 h-4" />
              <span>Attendance</span>
            </NavLink>
            <NavLink to="/leaves" className={navItemClass}>
              <CalendarCheck className="w-4 h-4" />
              <span>Leave Requests</span>
            </NavLink>
          </nav>
        </div>

        {/* Admin & Manager Section */}
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Management
            </p>
            <nav className="space-y-1">
              <NavLink to="/employees" className={navItemClass}>
                <Users className="w-4 h-4" />
                <span>Employees</span>
              </NavLink>
              {role === 'ADMIN' && (
                <>
                  <NavLink to="/departments" className={navItemClass}>
                    <Building2 className="w-4 h-4" />
                    <span>Departments</span>
                  </NavLink>
                  <NavLink to="/shifts" className={navItemClass}>
                    <Briefcase className="w-4 h-4" />
                    <span>Shifts</span>
                  </NavLink>
                  <NavLink to="/workplaces" className={navItemClass}>
                    <MapPin className="w-4 h-4" />
                    <span>Workplaces (GPS)</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        )}

        {/* Analytics & Reports */}
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Insights & Data
            </p>
            <nav className="space-y-1">
              <NavLink to="/analytics" className={navItemClass}>
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </NavLink>
              <NavLink to="/reports" className={navItemClass}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Reports & Export</span>
              </NavLink>
              {role === 'ADMIN' && (
                <NavLink to="/audit-logs" className={navItemClass}>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* User Card at bottom */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {user?.fullName || user?.email.split('@')[0]}
            </p>
            <span className="inline-block text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
