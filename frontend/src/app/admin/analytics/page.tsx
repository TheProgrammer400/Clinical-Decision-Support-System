'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 glass-panel rounded-3xl border border-purple-500/30">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-purple-400" />
          <span>Usage & System Analytics</span>
        </h1>
        <p className="text-sm text-slate-400">Aggregate query metrics, MRI utilization trends, and API workload stats.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs uppercase text-slate-500 font-bold">MRI vs Non-MRI Ratio</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">27.6% MRI</div>
          <p className="text-xs text-slate-500">687 out of 2,481 clinical queries attached brain MRI</p>
        </div>
        <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs uppercase text-slate-500 font-bold">Avg Analysis Time</div>
          <div className="text-2xl font-bold text-sky-400 font-mono">2.68 sec</div>
          <p className="text-xs text-slate-500">End-to-end processing latency including U-Net + Groq</p>
        </div>
        <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs uppercase text-slate-500 font-bold">Success Rate</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">99.8%</div>
          <p className="text-xs text-slate-500">Zero critical service outages recorded this month</p>
        </div>
      </div>

      <div className="p-6 glass-panel rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200">Query Volume Trend (Last 30 Days)</h3>
        <div className="h-48 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-end justify-between p-6 space-x-2 font-mono text-xs">
          {[45, 62, 58, 71, 89, 94, 82, 104, 115, 98, 124, 130, 142, 128, 150, 165, 158, 172, 189, 195, 210, 204, 220, 235, 240, 252, 248, 260, 275, 284].map((v, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-purple-600/40 to-sky-400/80 rounded-t hover:bg-sky-400 transition-all group relative" style={{ height: `${(v / 300) * 100}%` }}>
              <span className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-[10px] text-white">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
