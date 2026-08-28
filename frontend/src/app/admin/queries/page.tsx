'use client';

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Cpu, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminQueriesPage() {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAdminQueries(1, 50);
      setQueries(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch clinical query telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between p-6 glass-panel rounded-3xl border border-purple-500/30">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 text-purple-400" />
            <span>Clinical Queries Monitoring</span>
          </h1>
          <p className="text-sm text-slate-400">System-wide query monitoring and audit telemetry.</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl">
          <Lock className="h-3.5 w-3.5" />
          <span>PHI Privacy Governance Active</span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading System-wide Queries...</div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Physician</th>
                  <th className="py-3.5 px-4">Case Reference</th>
                  <th className="py-3.5 px-4">MRI</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {queries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-900/50">
                    <td className="py-4 px-4 font-semibold text-slate-100">{q.doctorName}</td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      <span className="text-slate-200">#{q.id.slice(0, 8)}</span>
                      <span className="block text-[10px] text-slate-500 truncate max-w-xs">{q.caseTextSnippet}</span>
                    </td>
                    <td className="py-4 px-4">
                      {q.hasMri ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 inline-flex items-center space-x-1">
                          <Cpu className="h-3 w-3" />
                          <span>Yes ({q.mriCount})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">No</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          q.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString()}
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
