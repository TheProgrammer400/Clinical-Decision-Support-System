'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, Clock, User, Server } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getAuditLogs(1, 50)
      .then((data) => setLogs(data.data))
      .catch((err) => setError(err.message || 'Access denied or failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <ShieldAlert className="h-7 w-7 text-purple-400" />
          <span>System Audit Trail Log</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Append-only compliance audit trail capturing system events, authentication, and access records (PHI free).
        </p>
      </div>

      {error ? (
        <div className="p-6 glass-panel rounded-2xl border border-red-500/30 text-center text-red-400 text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Activity className="h-8 w-8 text-purple-400 animate-spin" />
          <div className="text-slate-400 text-sm">Loading audit events...</div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-300">{log.action}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.actorUser ? log.actorUser.email : 'system'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.resourceType}:{log.resourceId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{log.ipAddress || 'internal'}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
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
