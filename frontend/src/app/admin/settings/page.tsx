'use client';

import React from 'react';
import { Settings, Lock, Sliders } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 glass-panel rounded-3xl border border-purple-500/30">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <Settings className="h-6 w-6 text-purple-400" />
          <span>System Configuration & Settings</span>
        </h1>
        <p className="text-sm text-slate-400">Environment rules, upload limits, model versioning, and security controls.</p>
      </div>

      <div className="space-y-4">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-purple-400" />
            <span>AI & Image Model Preferences</span>
          </h3>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">Groq LLM Model Version:</span>
              <span className="text-sky-300">openai/gpt-oss-120b</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">U-Net Model Checkpoint:</span>
              <span className="text-purple-300">uNetModel_best.pth (unet_v1.2.0)</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">Prompt Pipeline Version:</span>
              <span className="text-emerald-400">v1.4.0 (Structured U-Net Findings)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Lock className="h-4 w-4 text-sky-400" />
            <span>Security & File Storage Policy</span>
          </h3>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">Max File Size Limit:</span>
              <span className="text-slate-200">20 MB per file</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">Allowed Image Extensions:</span>
              <span className="text-slate-200">.png, .jpg, .jpeg, .webp</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-400">JWT Token Expiry:</span>
              <span className="text-slate-200">15 minutes (Refresh: 7 days)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
