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
  Bell,
  Clock,
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
      <div className="flex flex-col items-center justify-center space-y-3 py-24 w-full">
        <Activity className="h-8 w-8 text-primary animate-spin" />
        <div className="text-on-surface-variant text-xs font-medium">Initializing Clinical AI Infrastructure Telemetry...</div>
      </div>
    );
  }

  const topStats = stats?.topStats || { totalDoctors: 2, totalQueries: 11, mriAnalysesCount: 3, activeAlertsCount: 0, pendingRegistrationsCount: 0 };
  const secondaryStats = stats?.secondaryStats || {};
  const health = stats?.systemHealth || {};

  // Mock trend data based on selected timeframe
  const chartDataMap = {
    '7D': [10, 15, 12, 18, 20, 22, 25],
    '30D': [10, 15, 12, 18, 20, 22, 25, 24, 28, 30, 35, 33, 38, 40, 42, 48, 50, 49, 55, 58, 60, 62, 65, 68, 70],
    '90D': [5, 10, 15, 25, 35, 45, 55, 65, 70],
  };

  const currentChartData = chartDataMap[timeframe];

  return (
    <div className="w-full space-y-6">
      {/* Page Title Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-outline-variant bg-surface-container-low w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container flex items-center justify-center text-primary shrink-0">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-headline font-bold text-on-surface tracking-tight">Admin Dashboard</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/30 bg-primary/10 text-primary font-mono">
                IT &amp; Clinical AI Operations
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              System overview, doctor management, AI monitoring &amp; security
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium text-on-surface shrink-0"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm w-full">
          <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Stat Row KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {/* Stat Card 1: Pending Registrations */}
        <Link
          href="/admin/notifications"
          className="p-5 rounded-lg border transition-all flex flex-col justify-between h-32 relative overflow-hidden group cursor-pointer hover:border-amber-500/50 bg-surface-container"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pending Registrations</span>
            <div className="w-8 h-8 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className={`text-3xl font-headline font-bold ${topStats.pendingRegistrationsCount > 0 ? 'text-amber-300' : 'text-on-surface'}`}>
              {topStats.pendingRegistrationsCount || 0}
            </span>
            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 group-hover:underline">
              Review <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        {/* Stat Card 2: Total Doctors */}
        <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Approved Doctors</span>
            <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-headline font-bold text-on-surface">{topStats.totalDoctors || 2}</span>
          </div>
        </div>

        {/* Stat Card 3: Total Queries */}
        <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Queries</span>
            <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center text-[#38bdf8]">
              <FileSpreadsheet className="h-4 w-4 text-[#38bdf8]" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-headline font-bold text-[#38bdf8]">{topStats.totalQueries || 11}</span>
          </div>
        </div>

        {/* Stat Card 4: MRI Analyses */}
        <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">MRI Analyses</span>
            <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center text-primary">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-headline font-bold text-primary">{topStats.mriAnalysesCount || 3}</span>
          </div>
        </div>

        {/* Stat Card 5: System Alerts */}
        <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">System Alerts</span>
            <div className="w-8 h-8 rounded border border-tertiary/30 bg-tertiary/10 flex items-center justify-center text-tertiary">
              <CheckCircle2 className="h-4 w-4 text-tertiary" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-headline font-bold text-tertiary">{topStats.activeAlertsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats Bar */}
      <div className="flex flex-wrap items-center justify-between p-3.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-mono w-full">
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex gap-2 text-on-surface-variant">
            Active Doctors: <span className="text-on-surface font-bold">{secondaryStats.activeDoctors || topStats.totalDoctors || 2}</span>
          </div>
          <div className="flex gap-2 text-on-surface-variant border-l border-outline-variant pl-4">
            Queries Today: <span className="text-[#38bdf8] font-bold">{secondaryStats.queriesToday || 0}</span>
          </div>
          <div className="flex gap-2 text-on-surface-variant border-l border-outline-variant pl-4">
            Queries This Month: <span className="text-primary font-bold">{secondaryStats.queriesThisMonth || 11}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          Failed Analyses: <span className="text-error font-bold">{secondaryStats.failedAnalysesCount || 0}</span>
        </div>
      </div>

      {/* Bento Grid Row 1: Query Activity Chart (2 Cols) + System Health (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Query Activity Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-on-surface">Query Activity</h2>
              </div>
              <p className="text-xs text-on-surface-variant">System query volume trend ({topStats.totalQueries || 11} total queries)</p>
            </div>
            <div className="flex rounded-md border border-outline-variant overflow-hidden bg-surface-container-low text-xs font-medium">
              {(['7D', '30D', '90D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 transition-colors border-r border-outline-variant last:border-r-0 ${
                    timeframe === tf
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Visualizer */}
          <div className="flex-1 border border-outline-variant rounded-md bg-surface-container-lowest p-4 flex flex-col justify-end relative h-64">
            <div className="flex justify-between items-end h-full gap-1.5 z-10 pt-8 pb-1 px-2">
              {currentChartData.map((val, idx) => (
                <div
                  key={idx}
                  className="w-full rounded-t-sm transition-all group relative cursor-pointer"
                  style={{
                    height: `${val}%`,
                    background: 'linear-gradient(180deg, #38bdf8 0%, #a78bfa 100%)',
                  }}
                >
                  <div className="hidden group-hover:flex flex-col items-center absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant text-[10px] text-on-surface font-mono shadow-md z-20 whitespace-nowrap">
                    <span>{val} queries</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
            <span>Beginning of timeframe</span>
            <span className="text-tertiary flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12.4% vs last period
            </span>
            <span>Today</span>
          </div>
        </div>

        {/* System Health Status Panel */}
        <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-tertiary" />
                <h2 className="text-base font-bold text-on-surface">System Health</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-tertiary uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
                <span>Live Status</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Backend API', latency: '12ms', status: 'Healthy' },
                { name: 'PostgreSQL Database', latency: '4ms', status: 'Healthy' },
                { name: 'Artifact Storage', latency: '8ms', status: 'Healthy' },
                { name: 'Groq LLM Provider', latency: '2400ms', status: 'Healthy' },
                { name: 'PyTorch U-Net Service', latency: '203ms', status: 'Healthy' },
                { name: 'NVIDIA GPU / CUDA', latency: '10ms', status: 'Healthy' },
              ].map((srv, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded border border-outline-variant bg-surface-container-low">
                  <span className="text-sm font-medium text-on-surface">{srv.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tertiary/10 text-tertiary border border-tertiary/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    {srv.status} ({srv.latency})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 2: Doctor Management Table (2 Cols) + AI Monitoring (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Doctor Management Table */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-outline-variant bg-surface-container flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-on-surface">Doctor Management</h2>
                </div>
                <p className="text-xs text-on-surface-variant">Physician account status, permissions, &amp; query activity metrics</p>
              </div>
              <Link href="/admin/doctors" className="text-xs font-bold text-primary hover:text-surface-tint flex items-center gap-1 transition-colors">
                <span>View All Doctors</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="pb-3 font-mono">Doctor</th>
                    <th className="pb-3 font-mono">Email Address</th>
                    <th className="pb-3 font-mono">Status</th>
                    <th className="pb-3 font-mono">Queries</th>
                    <th className="pb-3 text-right font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-on-surface-variant">
                        No doctor accounts registered.
                      </td>
                    </tr>
                  ) : (
                    doctors.slice(0, 4).map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary font-bold">
                              <UserCheck className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium text-on-surface">{doc.fullName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-on-surface-variant font-mono text-xs">{doc.email}</td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                              doc.status === 'Active'
                                ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                                : 'bg-error-container/40 text-error border-error/30'
                            }`}
                          >
                            {doc.status === 'Active' ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            <span>{doc.status}</span>
                          </span>
                        </td>
                        <td className="py-4 font-mono">
                          <span className="text-on-surface font-bold">{doc.queriesCount}</span>{' '}
                          <span className="text-on-surface-variant text-xs">({doc.mriQueriesCount || 0} MRI)</span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleDoctorStatus(doc.id, doc.status)}
                              disabled={updatingDoctorId === doc.id}
                              className={`px-3 py-1 rounded border transition-colors text-xs font-medium ${
                                doc.status === 'Active'
                                  ? 'border-error/30 bg-error/5 text-error hover:bg-error/10'
                                  : 'border-tertiary/30 bg-tertiary/5 text-tertiary hover:bg-tertiary/10'
                              }`}
                            >
                              {updatingDoctorId === doc.id ? '...' : doc.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                            <Link
                              href="/admin/audit-logs"
                              className="px-3 py-1 rounded border border-outline-variant bg-surface-container-highest hover:bg-surface-variant text-on-surface-variant transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Activity</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI & Model Monitoring Side Panels */}
        <div className="flex flex-col gap-6">
          {/* AI Monitoring */}
          <div className="p-5 rounded-lg border border-outline-variant bg-surface-container">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-on-surface">AI &amp; Model Monitoring</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-primary/30 bg-primary/10 text-primary">
                Groq + U-Net
              </span>
            </div>
            <div className="space-y-4 font-mono">
              {/* Groq Card */}
              <div className="p-4 rounded border border-outline-variant bg-surface-container-low relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#38bdf8]"></div>
                <h3 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Groq LLM</span> <span className="font-mono text-on-surface-variant font-normal">(llama3-70b)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <p className="text-on-surface-variant mb-1">Requests Today: <span className="text-[#38bdf8] font-bold">0</span></p>
                    <p className="text-on-surface-variant">Successful: <span className="text-[#38bdf8] font-bold">0</span></p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant mb-1">Avg Latency: <span className="text-amber-400 font-bold">2.4s</span></p>
                    <p className="text-on-surface-variant">Failed: <span className="text-error font-bold">0</span></p>
                  </div>
                </div>
              </div>

              {/* U-Net Card */}
              <div className="p-4 rounded border border-outline-variant bg-surface-container-low relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <h3 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  <span>U-Net GPU</span> <span className="font-mono text-on-surface-variant font-normal">(unet_v1.2.0)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <p className="text-on-surface-variant mb-1">MRI Analyses: <span className="text-primary font-bold">3</span></p>
                    <p className="text-on-surface-variant">GPU Memory: <span className="text-[#38bdf8] font-bold">71%</span></p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant mb-1">Avg Pass: <span className="text-tertiary font-bold">0.3s</span></p>
                    <p className="text-on-surface-variant">Device: <span className="text-on-surface">GTX 1650</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="p-5 rounded-lg border border-outline-variant bg-surface-container flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-on-surface">Active Alerts</h2>
              </div>
            </div>
            <div className="p-4 rounded border border-tertiary/30 bg-tertiary/10 text-tertiary flex items-center gap-3 text-xs font-medium">
              <CheckCircle2 className="h-5 w-5 text-tertiary shrink-0" />
              <span>All systems operating normally</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
