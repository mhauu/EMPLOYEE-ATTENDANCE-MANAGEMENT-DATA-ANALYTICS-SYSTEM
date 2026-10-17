import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Department } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MetricCard } from '../components/MetricCard';
import {
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
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

  // Bộ lọc
  const [departmentId, setDepartmentId] = useState('');
  const [days, setDays] = useState(30);

  // Bộ dữ liệu thống kê
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
      // Bỏ qua
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

  const getStatusLabelVi = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'Đúng giờ';
      case 'LATE': return 'Đi trễ';
      case 'EARLY_LEAVE': return 'Về sớm';
      case 'OVERTIME': return 'Tăng ca (OT)';
      case 'LEAVE': return 'Nghỉ phép';
      case 'ABSENT': return 'Vắng mặt';
      default: return status;
    }
  };

  const localizedPieData = statusDistribution.map((item) => ({
    ...item,
    name: getStatusLabelVi(item.status),
  }));

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Thống Kê & Phân Tích Dữ Liệu Nhân Sự</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Hệ thống phân tích tự động chuyển hóa dữ liệu chấm công GPS thành các chỉ số vận hành chiến lược
          </p>
        </div>

        {/* Bộ lọc thời gian & Phòng ban */}
        <div className="flex items-center gap-2 self-start text-xs">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 shadow-sm"
          >
            <option value={7}>7 ngày vừa qua</option>
            <option value={14}>14 ngày vừa qua</option>
            <option value={30}>30 ngày vừa qua</option>
            <option value={60}>60 ngày vừa qua</option>
          </select>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 shadow-sm"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Các Thẻ KPI Quan Trọng */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Tỷ Lệ Chuyên Cần"
            value={`${summary.attendanceRate}%`}
            subtitle="Số lượt có mặt / Ngày công"
            icon={TrendingUp}
            color="emerald"
          />
          <MetricCard
            title="Tỷ Lệ Đi Trễ"
            value={`${summary.lateRate}%`}
            subtitle="Số lượt trễ / Tổng lượt vào"
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Thời Gian Làm Việc TB"
            value={`${summary.averageWorkingHours}h`}
            subtitle="Đã trừ thời gian nghỉ trưa"
            icon={Calendar}
            color="brand"
          />
          <MetricCard
            title="Tổng Giờ Tăng Ca"
            value={`${summary.totalOvertimeHours}h`}
            subtitle="Thời gian làm ngoài giờ quy định"
            icon={Sparkles}
            color="blue"
          />
        </div>
      )}

      {/* Nhận Định Tự Động Từ Dữ Liệu Thực Tế (Data Insights) */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-indigo-950/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
            Nhận Định Vận Hành Tự Động (Data Insights)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {insights.map((text, i) => (
            <div key={i} className="p-3 bg-white/10 rounded-xl text-xs backdrop-blur-sm border border-white/10 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <p className="text-slate-100 leading-relaxed font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Đang vẽ biểu đồ thống kê trực quan..." />
      ) : (
        <div className="space-y-6">
          {/* Biểu đồ 1: Biểu đồ đường xu hướng chấm công theo thời gian */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Xu Hướng Số Lượng Chấm Công Theo Thời Gian</h3>
              <p className="text-xs text-slate-500">Thống kê theo ngày: Đúng giờ, Đi trễ, Nghỉ phép và Vắng mặt</p>
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
                  <Line type="monotone" dataKey="present" name="Đúng giờ" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="late" name="Đi trễ" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" name="Vắng mặt" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leave" name="Nghỉ phép" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hàng biểu đồ 2: So sánh phòng ban (Cột) và Phân bổ trạng thái (Tròn) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ Cột: So sánh tỷ lệ giữa các phòng ban */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800">So Sánh Tỷ Lệ Chuyên Cần Giữa Các Phòng Ban</h3>
                <p className="text-xs text-slate-500">Tỷ lệ có mặt và Tỷ lệ đi trễ (%) trên từng bộ phận doanh nghiệp</p>
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
                    <Bar dataKey="attendanceRate" name="Tỷ lệ chuyên cần (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lateRate" name="Tỷ lệ đi trễ (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Biểu đồ Tròn: Phân bổ trạng thái điểm danh */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-800">Phân Bổ Trạng Thái</h3>
                <p className="text-xs text-slate-500">Tỷ trọng các trạng thái điểm danh</p>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={localizedPieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {localizedPieData.map((entry, index) => (
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
