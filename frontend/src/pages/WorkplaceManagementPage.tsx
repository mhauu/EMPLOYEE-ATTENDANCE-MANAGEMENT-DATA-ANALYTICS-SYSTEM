import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Workplace, Employee } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Plus, MapPin, Compass, Check, X, Shield, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const WorkplaceManagementPage: React.FC = () => {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Create workplace modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workplaceForm, setWorkplaceForm] = useState({
    name: '',
    address: '',
    latitude: 10.776889,
    longitude: 106.700806,
    allowedRadiusMeters: 100,
  });

  // Assign workplace modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    locationId: '',
    effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
  });
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [locRes, empRes] = await Promise.all([
        api.get('/locations'),
        api.get('/employees?limit=100'),
      ]);
      setWorkplaces(locRes.data.data);
      setEmployees(empRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations', workplaceForm);
      setShowCreateModal(false);
      setWorkplaceForm({
        name: '',
        address: '',
        latitude: 10.776889,
        longitude: 106.700806,
        allowedRadiusMeters: 100,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating workplace');
    }
  };

  const handleAssignWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/assign', assignForm);
      setShowAssignModal(false);
      setMsg('Workplace assigned to employee successfully!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning workplace');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkplaceForm({
          ...workplaceForm,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        });
      },
      () => alert('Could not get current GPS coordinates')
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Workplace Geofencing (GPS)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Define corporate office coordinates, allowed check-in radius, and employee allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-500" /> Assign Workplace to Employee
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Workplace
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      {/* Geofence notice */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Server-Side Geofencing Verification</p>
          <p className="text-indigo-700 mt-0.5 leading-relaxed">
            When employees check in, their browser transmits latitude and longitude. The backend computes the exact spherical distance using the Haversine formula against these designated workplace coordinates. Check-in is rejected if distance exceeds the allowed radius.
          </p>
        </div>
      </div>

      {/* Workplaces Grid */}
      {loading ? (
        <LoadingSpinner text="Loading workplaces..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workplaces.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-base">{w.name}</span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </span>
              </div>

              <div className="py-4 space-y-2.5 text-xs text-slate-600">
                <p className="line-clamp-2 text-slate-500">{w.address}</p>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Latitude:</span>
                    <span className="font-semibold text-slate-800">{Number(w.latitude).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Longitude:</span>
                    <span className="font-semibold text-slate-800">{Number(w.longitude).toFixed(6)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span>Allowed Radius:</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                    {w.allowedRadiusMeters} meters
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workplace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">New Workplace Geofence</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkplace} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Workplace Name</label>
                <input
                  type="text"
                  required
                  value={workplaceForm.name}
                  onChange={(e) => setWorkplaceForm({ ...workplaceForm, name: e.target.value })}
                  placeholder="Main Headquarters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={workplaceForm.address}
                  onChange={(e) => setWorkplaceForm({ ...workplaceForm, address: e.target.value })}
                  placeholder="123 Corporate Blvd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-slate-700">GPS Coordinates</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" /> Use my current location
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={workplaceForm.latitude}
                    onChange={(e) =>
                      setWorkplaceForm({ ...workplaceForm, latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={workplaceForm.longitude}
                    onChange={(e) =>
                      setWorkplaceForm({ ...workplaceForm, longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Allowed Check-in Radius (meters)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  required
                  value={workplaceForm.allowedRadiusMeters}
                  onChange={(e) =>
                    setWorkplaceForm({
                      ...workplaceForm,
                      allowedRadiusMeters: parseInt(e.target.value) || 100,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Save Workplace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Workplace Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Assign Workplace to Employee</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignWorkplace} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Workplace</label>
                <select
                  required
                  value={assignForm.locationId}
                  onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Workplace</option>
                  {workplaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.allowedRadiusMeters}m radius)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective From</label>
                <input
                  type="date"
                  required
                  value={assignForm.effectiveFrom}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
