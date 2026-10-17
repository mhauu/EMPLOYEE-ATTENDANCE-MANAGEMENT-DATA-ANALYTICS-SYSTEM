import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import { Shift, Workplace, AttendanceRecord } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  MapPin,
  Clock,
  Compass,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  // Trạng thái nhân viên
  const [shift, setShift] = useState<Shift | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [personalSummary, setPersonalSummary] = useState<any>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [workingDuration, setWorkingDuration] = useState<string>('00 giờ 00 phút 00 giây');

  // Trạng thái Quản trị viên / Trưởng phòng
  const [adminSummary, setAdminSummary] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Đồng hồ đếm thời gian làm việc thực tế khi đã check-in
  useEffect(() => {
    if (!todayAttendance?.checkIn || todayAttendance?.checkOut) return;

    const timer = setInterval(() => {
      const start = new Date(todayAttendance.checkIn!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setWorkingDuration(
        `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [todayAttendance]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isEmployee) {
        const [shiftRes, locRes, todayRes, sumRes] = await Promise.all([
          api.get('/shifts/my/current'),
          api.get('/locations/my/current'),
          api.get('/attendance/today'),
          api.get('/employees/my/attendance-summary'),
        ]);
        setShift(shiftRes.data.data);
        setWorkplace(locRes.data.data);
        setTodayAttendance(todayRes.data.data);
        setPersonalSummary(sumRes.data.data);
      } else {
        const [summaryRes, insightsRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/insights'),
        ]);
        setAdminSummary(summaryRes.data.data);
        setInsights(insightsRes.data.data);
      }
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Xử lý Chấm công vào ca (Check-in GPS)
  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Trình duyệt của bạn không hỗ trợ chức năng định vị GPS.' });
      return;
    }

    setGpsStatus('Đang truy vấn tọa độ GPS chính xác từ thiết bị...');
    setActionLoading(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`Đã nhận tọa độ (độ chính xác ±${Math.round(accuracy)}m). Đang gửi lên máy chủ để tính toán khoảng cách...`);

        try {
          const res = await api.post('/attendance/check-in', { latitude, longitude, accuracy });
          setTodayAttendance(res.data.data.attendance);
          setFeedback({
            type: 'success',
            message: `Chấm công vào ca thành công! Khoảng cách đo được tới văn phòng: ${res.data.data.distance}m. ${
              res.data.data.lateMinutes > 0 ? `Ghi nhận đi trễ ${res.data.data.lateMinutes} phút.` : 'Đúng giờ.'
            }`,
          });
          loadData();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: err.response?.data?.message || 'Chấm công thất bại. Vui lòng thử lại.',
          });
        } finally {
          setActionLoading(false);
          setGpsStatus('');
        }
      },
      (err) => {
        setActionLoading(false);
        setGpsStatus('');
        let msg = 'Không thể lấy tọa độ GPS từ thiết bị của bạn.';
        if (err.code === 1) msg = 'Quyền truy cập vị trí bị từ chối! Vui lòng cho phép quyền truy cập vị trí (Location) trên trình duyệt để điểm danh.';
        setFeedback({ type: 'error', message: msg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Xử lý Kết thúc ca làm việc (Check-out GPS)
  const handleCheckOut = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Trình duyệt không hỗ trợ định vị GPS.' });
      return;
    }

    setGpsStatus('Đang xác định tọa độ GPS để kết thúc ca...');
    setActionLoading(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`Đã nhận tọa độ GPS. Đang xác thực bán kính tan ca...`);

        try {
          const res = await api.post('/attendance/check-out', { latitude, longitude, accuracy });
          setTodayAttendance(res.data.data.attendance);
          setFeedback({
            type: 'success',
            message: `Kết thúc ca thành công! Tổng thời gian làm việc thực tế: ${res.data.data.workingHours} giờ.`,
          });
          loadData();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: err.response?.data?.message || 'Kết thúc ca thất bại.',
          });
        } finally {
          setActionLoading(false);
          setGpsStatus('');
        }
      },
      (err) => {
        setActionLoading(false);
        setGpsStatus('');
        setFeedback({ type: 'error', message: 'Không thể lấy tọa độ GPS để kết thúc ca.' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) return <LoadingSpinner text="Đang tải dữ liệu bảng điều khiển..." />;

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAO DIỆN DÀNH CHO NHÂN VIÊN (EMPLOYEE DASHBOARD)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isEmployee) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Lời chào mừng */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">Cổng Thông Tin Nhân Viên</span>
            <h2 className="text-2xl font-bold mt-1">Xin chào, {user?.fullName || user?.email}</h2>
            <p className="text-sm text-indigo-100 mt-1 capitalize">
              Hôm nay là {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <span className="text-[11px] text-indigo-200 block uppercase font-medium">Văn phòng làm việc</span>
            <span className="font-semibold text-sm flex items-center gap-1.5 justify-end mt-0.5">
              <MapPin className="w-4 h-4 text-indigo-300" /> {workplace?.name || 'Chưa phân bổ'}
            </span>
          </div>
        </div>

        {/* Hộp thông báo phản hồi nghiệp vụ */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{feedback.type === 'success' ? 'Thành công' : 'Thông báo chấm công'}</p>
              <p className="text-xs mt-0.5">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Khung Chấm công trọng tâm (Nút bấm lớn, tối ưu di động) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ca làm việc hôm nay</span>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                {shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : 'Chưa được phân ca làm việc'}
              </h3>
              {shift && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Thời gian ân hạn: {shift.gracePeriodMinutes} phút • Nghỉ trưa: {shift.breakStart || '12:00'} - {shift.breakEnd || '13:00'}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Trạng thái điểm danh</span>
              <div className="mt-1">
                {todayAttendance ? (
                  <StatusBadge status={todayAttendance.status} />
                ) : (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Chưa chấm công
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vùng thao tác Chấm công */}
          <div className="py-8 flex flex-col items-center justify-center text-center">
            {/* Trường hợp 1: Chưa chấm công vào ca */}
            {!todayAttendance?.checkIn && (
              <div className="space-y-4 max-w-md">
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading || !workplace}
                  className="w-48 h-48 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 flex flex-col items-center justify-center gap-2 font-bold text-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mx-auto"
                >
                  <Compass className="w-8 h-8 animate-pulse" />
                  <span>VÀO CA (GPS)</span>
                  <span className="text-[11px] font-normal text-indigo-200">Xác thực vị trí Geofence</span>
                </button>
                <p className="text-xs text-slate-500">
                  Nhấn nút trên để trình duyệt lấy tọa độ GPS thực tế. Máy chủ sẽ tự động kiểm tra khoảng cách so với bán kính cho phép ({workplace?.allowedRadiusMeters || 100}m) của {workplace?.name || 'văn phòng'}.
                </p>
              </div>
            )}

            {/* Trường hợp 2: Đang trong ca làm việc (Hiển thị đồng hồ đếm trực tiếp) */}
            {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
              <div className="space-y-4 max-w-md">
                <div className="inline-block p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-2">
                  <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">Thời gian làm việc trực tiếp</span>
                  <span className="text-3xl font-extrabold text-indigo-900 tracking-tight block mt-1 font-mono">
                    {workingDuration}
                  </span>
                  <span className="text-[11px] text-indigo-600 block mt-0.5">
                    Thời điểm vào ca: {format(new Date(todayAttendance.checkIn), 'HH:mm:ss')}
                  </span>
                </div>

                <div>
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="w-44 h-44 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-100 flex flex-col items-center justify-center gap-2 font-bold text-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mx-auto"
                  >
                    <Clock className="w-8 h-8" />
                    <span>KẾT THÚC CA</span>
                    <span className="text-[11px] font-normal text-amber-100">Xác thực GPS tan ca</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Khi chuẩn bị ra về, nhấn KẾT THÚC CA để hệ thống tính toán số giờ làm việc thực tế và giờ tăng ca ngoài giờ.
                </p>
              </div>
            )}

            {/* Trường hợp 3: Đã hoàn thành ca làm việc của ngày */}
            {todayAttendance?.checkOut && (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 max-w-md w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-lg font-bold text-emerald-900">Đã Hoàn Thành Chấm Công Hôm Nay</h4>
                <div className="mt-4 grid grid-cols-2 gap-3 text-left bg-white p-4 rounded-xl border border-emerald-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Giờ vào (Check-in)</span>
                    <span className="font-semibold text-slate-800">
                      {format(new Date(todayAttendance.checkIn!), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Giờ ra (Check-out)</span>
                    <span className="font-semibold text-slate-800">
                      {format(new Date(todayAttendance.checkOut), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Giờ làm việc thực tế</span>
                    <span className="font-semibold text-slate-800">{todayAttendance.workingHours} giờ</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tăng ca (OT)</span>
                    <span className="font-semibold text-slate-800">{todayAttendance.overtimeHours} giờ</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dòng trạng thái tiến trình GPS */}
            {gpsStatus && (
              <p className="text-xs text-indigo-600 font-medium animate-pulse mt-4">
                {gpsStatus}
              </p>
            )}
          </div>
        </div>

        {/* Thống kê cá nhân trong tháng */}
        {personalSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Tỷ lệ chuyên cần"
              value={`${personalSummary.attendanceRate}%`}
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Số ngày đi trễ"
              value={personalSummary.late}
              subtitle={`TB trễ ${personalSummary.averageLateMinutes} phút`}
              icon={Clock}
              color="amber"
            />
            <MetricCard
              title="Giờ làm việc TB"
              value={`${personalSummary.averageWorkingHours}h`}
              icon={Calendar}
              color="brand"
            />
            <MetricCard
              title="Tổng giờ tăng ca"
              value={`${personalSummary.totalOvertimeHours}h`}
              icon={Sparkles}
              color="blue"
            />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAO DIỆN QUẢN TRỊ VIÊN / TRƯỞNG PHÒNG (ADMIN / MANAGER DASHBOARD)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {user?.role === 'ADMIN' ? 'Tổng Quan Chấm Công Doanh Nghiệp' : 'Tổng Quan Chấm Công Phòng Ban'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            Số liệu thời gian thực cập nhật ngày hôm nay ({format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })})
          </p>
        </div>
      </div>

      {/* Các thẻ KPI số liệu thực tế */}
      {adminSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Đang hoạt động"
            value={adminSummary.activeEmployees}
            subtitle={`trên tổng ${adminSummary.totalEmployees} nhân sự`}
            icon={Users}
            color="brand"
          />
          <MetricCard
            title="Có mặt hôm nay"
            value={adminSummary.present}
            subtitle={`Đạt ${adminSummary.attendanceRate}%`}
            icon={CheckCircle2}
            color="emerald"
          />
          <MetricCard
            title="Đi trễ hôm nay"
            value={adminSummary.late}
            subtitle={`Tỷ lệ trễ ${adminSummary.lateRate}%`}
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Vắng hôm nay"
            value={adminSummary.absent}
            icon={AlertCircle}
            color="rose"
          />
          <MetricCard
            title="Nghỉ phép hôm nay"
            value={adminSummary.onLeave}
            subtitle={`${adminSummary.pendingLeaves} đơn chờ duyệt`}
            icon={Calendar}
            color="blue"
          />
          <MetricCard
            title="Thời gian làm TB"
            value={`${adminSummary.averageWorkingHours}h`}
            subtitle={`${adminSummary.totalOvertimeHours}h tăng ca`}
            icon={TrendingUp}
            color="brand"
          />
        </div>
      )}

      {/* Khối Phân tích Insight tự động sinh từ dữ liệu thật */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Nhận Định Vận Hành Thông Minh (Data Insights)</h3>
            <p className="text-xs text-slate-500">Tự động kết xuất từ dữ liệu chấm công và quy luật làm việc gần đây</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
              <p className="text-slate-700 leading-relaxed font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
