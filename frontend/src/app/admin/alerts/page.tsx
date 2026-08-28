'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AdminAlertsPage() {
  const alertsList = [
    { id: '1', title: 'Groq API Latency Spike', severity: 'warning', message: 'Average Groq LLM latency reached 3.8s during peak hours.', time: '12 mins ago' },
    { id: '2', title: 'GPU VRAM Memory High', severity: 'warning', message: 'NVIDIA GeForce GTX 1650 VRAM utilization exceeded 75%.', time: '1 hour ago' },
    { id: '3', title: 'Automated Diagnostic Backup', severity: 'info', message: 'Daily PostgreSQL database automated backup completed successfully.', time: '4 hours ago' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 glass-panel rounded-3xl border border-purple-500/30">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <span>System Alerts & Incidents</span>
        </h1>
        <p className="text-sm text-slate-400">Real-time alerts, rate limits, infrastructure warnings, and security notifications.</p>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-4">
        {alertsList.map((a) => (
          <div key={a.id} className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-sm flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>{a.title}</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{a.time}</span>
            </div>
            <p className="text-xs text-slate-400">{a.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
