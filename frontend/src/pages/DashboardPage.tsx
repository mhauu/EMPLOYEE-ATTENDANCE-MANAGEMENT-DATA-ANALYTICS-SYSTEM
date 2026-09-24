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

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  // Employee state
  const [shift, setShift] = useState<Shift | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [personalSummary, setPersonalSummary] = useState<any>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [workingDuration, setWorkingDuration] = useState<string>('00h 00m 00s');

  // Admin/Manager state
  const [adminSummary, setAdminSummary] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Live timer for checked-in employee
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
        `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
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
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // GPS Check-in handler
  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    setGpsStatus('Requesting GPS location from device...');
    setActionLoading(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`GPS acquired (accuracy: ${Math.round(accuracy)}m). Verifying radius...`);

        try {
          const res = await api.post('/attendance/check-in', { latitude, longitude, accuracy });
          setTodayAttendance(res.data.data.attendance);
          setFeedback({
            type: 'success',
            message: `Check-in approved! Distance to workplace: ${res.data.data.distance}m. ${
              res.data.data.lateMinutes > 0 ? `Late by ${res.data.data.lateMinutes} mins.` : 'On time.'
            }`,
          });
          loadData();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: err.response?.data?.message || 'Check-in failed.',
          });
        } finally {
          setActionLoading(false);
          setGpsStatus('');
        }
      },
      (err) => {
        setActionLoading(false);
        setGpsStatus('');
        let msg = 'Unable to acquire GPS coordinates.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser.';
        setFeedback({ type: 'error', message: msg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // GPS Check-out handler
  const handleCheckOut = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation not supported.' });
      return;
    }

    setGpsStatus('Requesting GPS location for checkout...');
    setActionLoading(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`GPS acquired. Verifying checkout location...`);

        try {
          const res = await api.post('/attendance/check-out', { latitude, longitude, accuracy });
          setTodayAttendance(res.data.data.attendance);
          setFeedback({
            type: 'success',
            message: `Check-out successful! Total working time: ${res.data.data.workingHours} hrs.`,
          });
          loadData();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: err.response?.data?.message || 'Check-out failed.',
          });
        } finally {
          setActionLoading(false);
          setGpsStatus('');
        }
      },
      (err) => {
        setActionLoading(false);
        setGpsStatus('');
        setFeedback({ type: 'error', message: 'Failed to obtain GPS for check-out.' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) return <LoadingSpinner text="Loading dashboard metrics..." />;

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPLOYEE DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (isEmployee) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">Employee Portal</span>
            <h2 className="text-2xl font-bold mt-1">Hello, {user?.fullName || user?.email}</h2>
            <p className="text-sm text-indigo-100 mt-1">
              Today is {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <span className="text-[11px] text-indigo-200 block uppercase font-medium">Assigned Workplace</span>
            <span className="font-semibold text-sm flex items-center gap-1.5 justify-end mt-0.5">
              <MapPin className="w-4 h-4 text-indigo-300" /> {workplace?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
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
              <p className="font-semibold">{feedback.type === 'success' ? 'Success' : 'Attendance Notice'}</p>
              <p className="text-xs mt-0.5">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Main Attendance Action Card (Mobile-friendly, big buttons) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Daily Schedule</span>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                {shift ? `${shift.name} (${shift.startTime} - ${shift.endTime})` : 'No active shift assigned'}
              </h3>
              {shift && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Grace period: {shift.gracePeriodMinutes} mins • Break: {shift.breakStart || '12:00'} - {shift.breakEnd || '13:00'}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-600 font-semibold uppercase block">Attendance Status</span>
              <div className="mt-1">
                {todayAttendance ? (
                  <StatusBadge status={todayAttendance.status} />
                ) : (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Not Checked In
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Center */}
          <div className="py-8 flex flex-col items-center justify-center text-center">
            {/* Case 1: Not checked in yet */}
            {!todayAttendance?.checkIn && (
              <div className="space-y-4 max-w-md">
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading || !workplace}
                  className="w-48 h-48 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 flex flex-col items-center justify-center gap-2 font-bold text-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mx-auto"
                >
                  <Compass className="w-8 h-8 animate-pulse" />
                  <span>CHECK IN</span>
                  <span className="text-[11px] font-normal text-indigo-200">Verify via GPS</span>
                </button>
                <p className="text-xs text-slate-500">
                  Click the button to obtain your browser GPS location. The server will verify whether you are within {workplace?.allowedRadiusMeters || 100}m of {workplace?.name || 'workplace'}.
                </p>
              </div>
            )}

            {/* Case 2: Checked in, working */}
            {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
              <div className="space-y-4 max-w-md">
                <div className="inline-block p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-2">
                  <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">Live Working Time</span>
                  <span className="text-3xl font-extrabold text-indigo-900 tracking-tight block mt-1">
                    {workingDuration}
                  </span>
                  <span className="text-[11px] text-indigo-600 block mt-0.5">
                    Checked in at: {format(new Date(todayAttendance.checkIn), 'HH:mm:ss')}
                  </span>
                </div>

                <div>
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="w-44 h-44 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-100 flex flex-col items-center justify-center gap-2 font-bold text-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mx-auto"
                  >
                    <Clock className="w-8 h-8" />
                    <span>CHECK OUT</span>
                    <span className="text-[11px] font-normal text-amber-100">GPS verified</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Ready to leave? Click CHECK OUT to finalize your working hours and overtime.
                </p>
              </div>
            )}

            {/* Case 3: Attendance completed for today */}
            {todayAttendance?.checkOut && (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 max-w-md w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-lg font-bold text-emerald-900">Today's Attendance Completed</h4>
                <div className="mt-4 grid grid-cols-2 gap-3 text-left bg-white p-4 rounded-xl border border-emerald-100 text-xs">
                  <div>
                    <span className="text-slate-600 block">Check-in</span>
                    <span className="font-semibold text-slate-800">
                      {format(new Date(todayAttendance.checkIn!), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Check-out</span>
                    <span className="font-semibold text-slate-800">
                      {format(new Date(todayAttendance.checkOut), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Total Working</span>
                    <span className="font-semibold text-slate-800">{todayAttendance.workingHours} hrs</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Overtime</span>
                    <span className="font-semibold text-slate-800">{todayAttendance.overtimeHours} hrs</span>
                  </div>
                </div>
              </div>
            )}

            {/* GPS progress status text */}
            {gpsStatus && (
              <p className="text-xs text-indigo-600 font-medium animate-pulse mt-4">
                {gpsStatus}
              </p>
            )}
          </div>
        </div>

        {/* Monthly Personal Summary Cards */}
        {personalSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Attendance Rate"
              value={`${personalSummary.attendanceRate}%`}
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Days Late"
              value={personalSummary.late}
              subtitle={`Avg ${personalSummary.averageLateMinutes} mins`}
              icon={Clock}
              color="amber"
            />
            <MetricCard
              title="Avg Working Hrs"
              value={`${personalSummary.averageWorkingHours}h`}
              icon={Calendar}
              color="brand"
            />
            <MetricCard
              title="Overtime"
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
  // ADMIN / MANAGER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {user?.role === 'ADMIN' ? 'Company Attendance Overview' : 'Department Attendance Overview'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time workplace attendance metrics and insights for today ({format(new Date(), 'dd MMMM yyyy')})
          </p>
        </div>
      </div>

      {/* Main KPI Cards (Real DB data) */}
      {adminSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Active"
            value={adminSummary.activeEmployees}
            subtitle={`of ${adminSummary.totalEmployees} total`}
            icon={Users}
            color="brand"
          />
          <MetricCard
            title="Present Today"
            value={adminSummary.present}
            subtitle={`${adminSummary.attendanceRate}% rate`}
            icon={CheckCircle2}
            color="emerald"
          />
          <MetricCard
            title="Late Today"
            value={adminSummary.late}
            subtitle={`${adminSummary.lateRate}% late rate`}
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Absent Today"
            value={adminSummary.absent}
            icon={AlertCircle}
            color="rose"
          />
          <MetricCard
            title="On Leave Today"
            value={adminSummary.onLeave}
            subtitle={`${adminSummary.pendingLeaves} pending approval`}
            icon={Calendar}
            color="blue"
          />
          <MetricCard
            title="Avg Working Time"
            value={`${adminSummary.averageWorkingHours}h`}
            subtitle={`${adminSummary.totalOvertimeHours}h OT`}
            icon={TrendingUp}
            color="brand"
          />
        </div>
      )}

      {/* Data Insights Section (AI-style automated analysis of actual DB records) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Operational Data Insights</h3>
            <p className="text-xs text-slate-500">Calculated dynamically from recent attendance aggregations</p>
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
