import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Department } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MetricCard } from '../components/MetricCard';
import {
  TrendingUp,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  PieChart as PieIcon,
  BarChart2,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [departmentId, setDepartmentId] = useState('');
  const [days, setDays] = useState(30);

  // Analytics datasets
  const [trendData, setTrendData] = useState<any[]>([]);
  const [deptAnalytics, setDeptAnalytics] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params: any = { days };
      if (departmentId) params.departmentId = departmentId;

      const [trendRes, deptRes, distRes, insRes, sumRes, deptListRes] = await Promise.all([
        api.get('/analytics/trend', { params }),
        api.get('/analytics/departments', { params }),
        api.get('/analytics/status-distribution', { params }),
        api.get('/analytics/insights', { params }),
        api.get('/analytics/summary'),
        api.get('/departments'),
      ]);

      setTrendData(trendRes.data.data);
      setDeptAnalytics(deptRes.data.data);
      setStatusDistribution(distRes.data.data);
      setInsights(insRes.data.data);
      setSummary(sumRes.data.data);
      setDepartments(deptListRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [departmentId, days]);

  const PIE_COLORS: Record<string, string> = {
    PRESENT: '#10b981',
    LATE: '#f59e0b',
    EARLY_LEAVE: '#f97316',
    OVERTIME: '#6366f1',
    LEAVE: '#3b82f6',
    ABSENT: '#ef4444',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Workforce Data Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Statistical data pipeline transforming raw GPS attendance records into operational insights
          </p>
        </div>

        {/* Global Period & Dept Filters */}
        <div className="flex items-center gap-2 self-start text-xs">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 shadow-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
          </select>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 shadow-sm"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI High-Level Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Attendance Rate"
            value={`${summary.attendanceRate}%`}
            subtitle="Present / Working Days"
            icon={TrendingUp}
            color="emerald"
          />
          <MetricCard
            title="Late Occurrence Rate"
            value={`${summary.lateRate}%`}
            subtitle="Late / Total Present"
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Average Working Time"
            value={`${summary.averageWorkingHours}h`}
            subtitle="Net of break deduction"
            icon={Calendar}
            color="brand"
          />
          <MetricCard
            title="Total Overtime Hours"
            value={`${summary.totalOvertimeHours}h`}
            subtitle="Beyond shift end time"
            icon={Sparkles}
            color="blue"
          />
        </div>
      )}

      {/* AI / Automated Data Insights */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-indigo-950/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
            Real-Time Automated Data Insights
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {insights.map((text, i) => (
            <div key={i} className="p-3 bg-white/10 rounded-xl text-xs backdrop-blur-sm border border-white/10 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <p className="text-slate-100 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Rendering statistical charts..." />
      ) : (
        <div className="space-y-6">
          {/* Chart Row 1: Trend Line Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Attendance Volume Trend Over Time</h3>
              <p className="text-xs text-slate-500">Daily count of employees present, late, on leave, and absent</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="present" name="Present (On Time)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="late" name="Late Arrivals" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leave" name="Approved Leave" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Row 2: Department Comparison Bar Chart + Status Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Comparison Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800">Department Attendance Rate Comparison</h3>
                <p className="text-xs text-slate-500">Attendance and Late Rate (%) across company departments</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptAnalytics} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="attendanceRate" name="Attendance Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lateRate" name="Late Rate %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Status Pie/Donut Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-800">Status Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown of attendance conditions</p>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
