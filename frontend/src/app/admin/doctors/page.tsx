'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Activity, RefreshCw, Eye } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdminDoctors();
      setDoctors(data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      setUpdatingId(id);
      const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      await apiClient.updateDoctorStatus(id, nextStatus);
      await fetchDoctors();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between p-6 glass-panel rounded-3xl border border-purple-500/30">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
              <Users className="h-6 w-6 text-purple-400" />
              <span>Doctor Management</span>
            </h1>
            <p className="text-sm text-slate-400">View doctor profiles, manage access permissions, and audit case metrics.</p>
          </div>
          <button
            onClick={fetchDoctors}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl border border-purple-500/30"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading Doctor Accounts...</div>
        ) : (
          <div className="glass-panel rounded-3xl border border-slate-800 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Total Queries</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/50">
                      <td className="py-4 px-4 font-semibold text-slate-100">{doc.fullName}</td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-400">{doc.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            doc.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs">
                        {doc.queriesCount} <span className="text-slate-500">({doc.mriQueriesCount} MRI)</span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(doc.id, doc.status)}
                          disabled={updatingId === doc.id}
                          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg text-xs font-semibold border border-purple-500/30"
                        >
                          {updatingId === doc.id ? 'Updating...' : doc.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
