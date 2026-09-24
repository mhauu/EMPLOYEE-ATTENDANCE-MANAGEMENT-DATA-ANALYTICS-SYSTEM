import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Department } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FileSpreadsheet, Download, FileText, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'attendance' | 'late' | 'overtime' | 'leave'>('attendance');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data.data)).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentId) params.departmentId = departmentId;

      const res = await api.get(`/reports/${reportType}`, { params });
      setReportData(res.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, departmentId]);

  const handleDownload = (fileFormat: 'excel' | 'csv') => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (departmentId) params.append('departmentId', departmentId);
    params.append('format', fileFormat);

    const token = localStorage.getItem('token');
    const downloadUrl = `/api/reports/${reportType}?${params.toString()}`;

    // Download via fetch blob with token
    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${format(new Date(), 'yyyyMMdd')}.${
          fileFormat === 'excel' ? 'xlsx' : 'csv'
        }`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => alert('Export failed'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Report Generator & Exports</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Structured workforce reports with Excel (.xlsx) and CSV export capabilities
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => handleDownload('csv')}
            disabled={!reportData || reportData.records?.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={() => handleDownload('excel')}
            disabled={!reportData || reportData.records?.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-100 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        {[
          { id: 'attendance', label: 'Attendance Detail Report' },
          { id: 'late', label: 'Late Arrivals Report' },
          { id: 'overtime', label: 'Overtime Hours Report' },
          { id: 'leave', label: 'Leave Requests Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`pb-3 border-b-2 transition-colors ${
              reportType === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Department Scope</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
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

      {/* Report Summary KPI Chips */}
      {reportData?.summary && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3">
            Report Summary Metrics
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {Object.entries(reportData.summary).map(([k, v]) => (
              <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 block capitalize truncate">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-extrabold text-slate-800 text-base mt-0.5 block">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800">
            {reportData?.title || 'Report Records Preview'}
          </h3>
          <span className="text-xs text-slate-600">
            {reportData?.records?.length || 0} total records
          </span>
        </div>

        {loading ? (
          <LoadingSpinner text="Generating report data..." />
        ) : !reportData || reportData.records?.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <p className="text-sm font-medium">No records match the report criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-semibold tracking-wider sticky top-0">
                <tr>
                  {Object.keys(reportData.records[0]).map((h) => (
                    <th key={h} className="py-3 px-4 capitalize whitespace-nowrap">
                      {h.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.records.slice(0, 50).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    {Object.values(row).map((val: any, colIdx: number) => (
                      <td key={colIdx} className="py-2.5 px-4 whitespace-nowrap">
                        {String(val)}
                      </td>
                    ))}
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
