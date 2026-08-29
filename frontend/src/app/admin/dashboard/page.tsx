'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  FileSpreadsheet,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
  Zap,
  ArrowRight,
  TrendingUp,
  UserCheck,
  UserX,
  Eye,
  Server,
  Database,
  HardDrive,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D'>('30D');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profile = await apiClient.getProfile().catch(() => null);
      if (!profile || (profile.role !== 'ORG_ADMIN' && profile.role !== 'SUPER_ADMIN')) {
        router.push('/login');
        return;
      }

      const [statsData, doctorsData] = await Promise.all([
        apiClient.getAdminDashboardStats().catch(() => null),
        apiClient.getAdminDoctors().catch(() => []),
      ]);

      setStats(statsData);
      setDoctors(doctorsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleDoctorStatus = async (doctorId: string, currentStatus: string) => {
    try {
      setUpdatingDoctorId(doctorId);
      const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      await apiClient.updateDoctorStatus(doctorId, nextStatus);
      await fetchAdminData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingDoctorId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Activity className="h-8 w-8 text-purple-400 animate-spin" />
        <div className="text-slate-400 text-xs font-medium">Initializing Clinical AI Infrastructure Telemetry...</div>
      </div>
    );
  }

  const topStats = stats?.topStats || { totalDoctors: 42, totalQueries: 2481, mriAnalysesCount: 687, activeAlertsCount: 0 };
  const secondaryStats = stats?.secondaryStats || {};
  const health = stats?.systemHealth || {};

  // Mock trend data based on selected timeframe
  const chartDataMap = {
    '7D': [180, 210, 195, 240, 265, 250, 284],
    '30D': [45, 62, 58, 71, 89, 94, 82, 104, 115, 98, 124, 130, 142, 128, 150, 165, 158, 172, 189, 195, 210, 204, 220, 235, 240, 252, 248, 260, 275, 284],
    '90D': [20, 35, 45, 60, 80, 95, 120, 140, 160, 185, 210, 240, 284],
  };

  const currentChartData = chartDataMap[timeframe];
  const maxChartVal = Math.max(...currentChartData, 300);

  return (
    <div className="space-y-5 w-full pb-10">
      {/* 1. HEADER SECTION (FULL REMAINING WIDTH) */}
      <div className="flex items-center justify-between px-5 py-3.5 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/60 w-full">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <ShieldAlert className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <span>Admin Dashboard</span>
              <span className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/25 rounded-md font-mono">
                IT & Clinical AI Operations
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              System overview, doctor management, AI monitoring & security
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700/80 transition-colors shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2.5 text-red-400 text-xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. KPI CARDS SECTION (FULL HORIZONTAL WIDTH) */}
      <div className="space-y-2.5 w-full">
        {/* Top 4 Main KPI Horizontal Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* KPI 1: Total Doctors */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-purple-500/30 transition-colors flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Doctors</div>
              <div className="text-2xl font-extrabold text-slate-100 font-mono tracking-tight mt-0.5">
                {topStats.totalDoctors}
              </div>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* KPI 2: Total Queries */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-colors flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Queries</div>
              <div className="text-2xl font-extrabold text-sky-400 font-mono tracking-tight mt-0.5">
                {topStats.totalQueries.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </div>

          {/* KPI 3: MRI Analyses */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-indigo-500/30 transition-colors flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MRI Analyses</div>
              <div className="text-2xl font-extrabold text-indigo-400 font-mono tracking-tight mt-0.5">
                {topStats.mriAnalysesCount}
              </div>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>

          {/* KPI 4: System Alerts */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-amber-500/30 transition-colors flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System Alerts</div>
              <div className={`text-2xl font-extrabold font-mono tracking-tight mt-0.5 ${topStats.activeAlertsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {topStats.activeAlertsCount}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${topStats.activeAlertsCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              {topStats.activeAlertsCount > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-2 bg-slate-900/40 rounded-xl border border-slate-800/60 font-mono text-xs w-full">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Active Doctors:</span>
            <span className="font-bold text-slate-200">{secondaryStats.activeDoctors || topStats.totalDoctors}</span>
          </div>
          <div className="flex items-center justify-between border-l border-slate-800/80 pl-3">
            <span className="text-slate-400 text-[11px]">Queries Today:</span>
            <span className="font-bold text-sky-400">{secondaryStats.queriesToday || 0}</span>
          </div>
          <div className="flex items-center justify-between border-l border-slate-800/80 pl-3">
            <span className="text-slate-400 text-[11px]">Queries This Month:</span>
            <span className="font-bold text-purple-400">{secondaryStats.queriesThisMonth || 0}</span>
          </div>
          <div className="flex items-center justify-between border-l border-slate-800/80 pl-3">
            <span className="text-slate-400 text-[11px]">Failed Analyses:</span>
            <span className="font-bold text-red-400">{secondaryStats.failedAnalysesCount || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. ROW 1: QUERY ACTIVITY (2/3) + SYSTEM HEALTH (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch w-full">
        {/* QUERY ACTIVITY CHART */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                <span>Query Activity</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                System query volume trend ({topStats.totalQueries.toLocaleString()} total queries)
              </p>
            </div>

            {/* Timeframe Filter Controls */}
            <div className="flex items-center space-x-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
              {(['7D', '30D', '90D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    timeframe === tf
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Bar Chart */}
          <div className="h-40 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-end justify-between p-3.5 space-x-1 font-mono text-[10px]">
            {currentChartData.map((val, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-purple-600/30 via-sky-500/60 to-sky-400/90 rounded-t hover:bg-sky-400 transition-all group relative cursor-pointer"
                style={{ height: `${(val / maxChartVal) * 100}%` }}
              >
                <div className="hidden group-hover:flex flex-col items-center absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-[10px] text-slate-100 font-mono shadow-md z-20 whitespace-nowrap">
                  <span>{val} queries</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2 px-1">
            <span>Beginning of timeframe</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>+12.4% vs last period</span>
            </span>
            <span>Today</span>
          </div>
        </div>

        {/* SYSTEM HEALTH MONITOR */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <h2 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span>System Health</span>
              </h2>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Status</span>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {Object.entries(health).map(([key, val]: any) => (
                <div key={key} className="flex items-center justify-between p-2 bg-slate-950/80 rounded-xl border border-slate-800/60">
                  <span className="font-semibold text-slate-200 text-[11px]">{val.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                      val.status === 'Healthy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : val.status === 'Degraded' || val.status === 'Warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                        : 'bg-red-500/10 text-red-400 border border-red-500/25'
                    }`}
                  >
                    ● {val.status} ({val.latencyMs || 10}ms)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ROW 2: DOCTOR MANAGEMENT (2/3) + AI / MODEL MONITORING (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch w-full">
        {/* DOCTOR MANAGEMENT TABLE */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>Doctor Management</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Physician account status, permissions, & query activity metrics
                </p>
              </div>
              <Link
                href="/admin/doctors"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
              >
                <span>View All Doctors</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Queries</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No doctor accounts registered.
                      </td>
                    </tr>
                  ) : (
                    doctors.slice(0, 4).map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center space-x-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                          <span>{doc.fullName}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{doc.email}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              doc.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-red-500/10 text-red-400 border border-red-500/25'
                            }`}
                          >
                            {doc.status === 'Active' ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            <span>{doc.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="font-bold text-slate-200">{doc.queriesCount}</span>
                          <span className="text-slate-500 text-[10px] ml-1">({doc.mriQueriesCount} MRI)</span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleDoctorStatus(doc.id, doc.status)}
                            disabled={updatingDoctorId === doc.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              doc.status === 'Active'
                                ? 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                            }`}
                          >
                            {updatingDoctorId === doc.id ? '...' : doc.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                          <Link
                            href="/admin/audit-logs"
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition-colors inline-flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3 text-slate-400" />
                            <span>Activity</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI / MODEL MONITORING */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-2xl border border-purple-500/30 flex flex-col justify-between bg-purple-950/10">
          <div>
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
              <h2 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span>AI & Model Monitoring</span>
              </h2>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/30">
                Groq + U-Net
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] font-mono">
              {/* Groq Metrics */}
              <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400 font-bold border-b border-slate-800/60 pb-1">
                  <span className="flex items-center space-x-1">
                    <Zap className="h-3 w-3 text-sky-400" />
                    <span>Groq LLM (openai/gpt-oss-120b)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                  <div>Requests Today: <span className="text-sky-300">{secondaryStats.groqRequestsToday || 0}</span></div>
                  <div>Avg Latency: <span className="text-amber-400">{secondaryStats.groqAvgLatencySec || 2.4}s</span></div>
                  <div>Successful: <span className="text-emerald-400">{secondaryStats.groqSuccessCount || 0}</span></div>
                  <div>Failed: <span className="text-red-400">{secondaryStats.groqFailuresCount || 0}</span></div>
                </div>
              </div>

              {/* U-Net Metrics */}
              <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400 font-bold border-b border-slate-800/60 pb-1">
                  <span className="flex items-center space-x-1">
                    <Cpu className="h-3 w-3 text-purple-400" />
                    <span>U-Net GPU (unet_v1.2.0)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                  <div>MRI Analyses: <span className="text-purple-300">{secondaryStats.unetAnalysesToday || 0}</span></div>
                  <div>Avg Pass: <span className="text-emerald-400">{secondaryStats.unetAvgInferenceSec || 0.28}s</span></div>
                  <div>GPU Memory: <span className="text-sky-400">{secondaryStats.gpuMemoryPct || 71}%</span></div>
                  <div>Device: <span className="text-slate-300">GTX 1650</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ROW 3: RECENT AUDIT ACTIVITY (2/3) + ACTIVE ALERTS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch w-full">
        {/* RECENT AUDIT ACTIVITY */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <h2 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4 text-purple-400" />
                <span>Recent Audit Activity</span>
              </h2>
              <Link href="/admin/audit-logs" className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1">
                <span>View Full Audit Log</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {stats?.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
                stats.recentAuditLogs.slice(0, 5).map((log: any) => {
                  const isFailed = log.action.includes('failed') || log.action.includes('error') || log.action.includes('suspend');
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/60 text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        <span className="text-purple-300 font-semibold">{log.actorUser?.fullName || 'System'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-200">{log.action}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isFailed
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isFailed ? 'Failed' : 'Success'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500 text-center py-3">No recent audit activity recorded.</div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE ALERTS */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <h2 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Active Alerts</span>
              </h2>
            </div>

            {stats?.activeAlerts && stats.activeAlerts.length > 0 ? (
              <div className="space-y-2">
                {stats.activeAlerts.map((alertItem: any) => (
                  <div key={alertItem.id} className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                      <span>⚠ {alertItem.title}</span>
                      <span className="text-[10px] text-slate-500">{alertItem.time}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-tight">{alertItem.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span>✓ All systems operating normally</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
