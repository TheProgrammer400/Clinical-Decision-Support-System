'use client';

import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAdminSystemHealth();
      setHealth(res);
    } catch {
      alert('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between p-6 glass-panel rounded-3xl border border-purple-500/30">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            <span>Infrastructure & System Health</span>
          </h1>
          <p className="text-sm text-slate-400">Live operational status of backend services, database, and inference worker.</p>
        </div>
        <button onClick={fetchHealth} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl border border-emerald-500/30">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Running Health Diagnostics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health &&
            Object.entries(health).map(([key, item]: any) => (
              <div key={key} className="p-5 glass-panel rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200">{item.name}</div>
                  <div className="text-xs text-slate-500 font-mono">Latency: {item.latencyMs}ms</div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-xs">
                  ● {item.status}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
