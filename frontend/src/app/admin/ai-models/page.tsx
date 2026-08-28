'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Zap, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminAiModelsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAiData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAdminAiModels();
      setData(res);
    } catch (err: any) {
      alert('Failed to load AI model telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between p-6 glass-panel rounded-3xl border border-purple-500/30">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Cpu className="h-6 w-6 text-purple-400" />
            <span>AI / Model Monitoring</span>
          </h1>
          <p className="text-sm text-slate-400">Real-time telemetry for Groq LLM & PyTorch U-Net GPU pipelines.</p>
        </div>
        <button onClick={fetchAiData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl border border-purple-500/30">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading AI Telemetry...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Groq Card */}
          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-sky-400" />
                <h3 className="text-lg font-bold text-slate-100">Groq LLM Service</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                ● Healthy
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">Model Name:</span>
                <span className="text-sky-300">{data?.groq?.modelName}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">Total Requests:</span>
                <span className="text-slate-200">{data?.groq?.requestsTotal}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">Avg Response Time:</span>
                <span className="text-amber-400">{data?.groq?.avgResponseTimeSec}s</span>
              </div>
            </div>
          </div>

          {/* U-Net GPU Card */}
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold text-slate-100">PyTorch U-Net GPU</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                ● {data?.unet?.status}
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">Model Version:</span>
                <span className="text-purple-300">{data?.unet?.modelVersion}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">GPU Device:</span>
                <span className="text-slate-200">{data?.unet?.gpuDevice}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl">
                <span className="text-slate-400">GPU Memory:</span>
                <span className="text-sky-400">{data?.unet?.gpuMemoryPct}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
