'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Cpu, FileText, Plus, RefreshCw } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { CaseStatusBadge, SeverityBadge } from '@/components/case/badges';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { RequireAuth, useSession } from '@/lib/session';
import type { CaseStats, CaseSummary } from '@/lib/types';

export default function DoctorDashboardPage() {
  return (
    <RequireAuth roles={['DOCTOR']}>
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const { user } = useSession();
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [recent, setRecent] = useState<CaseSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list] = await Promise.all([apiClient.getCaseStats(), apiClient.listCases(1, 20)]);
      setStats(s);
      setRecent(list.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const q = filter.trim().toLowerCase();
  const visible = q ? recent.filter((c) => c.caseTextPreview.toLowerCase().includes(q) || c.id.startsWith(q)) : recent;
  const urgent = recent.filter((c) => c.latestAnalysis?.alertSeverity === 'critical' || c.latestAnalysis?.alertSeverity === 'moderate');

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased">
      <DoctorSidebar />
      <main className="flex-1 min-w-0 p-6 md:p-8 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold">Welcome, {user?.fullName}</h1>
            <p className="text-sm text-on-surface-variant">Your clinical cases and their decision-support status.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-outline-variant rounded text-sm" aria-label="Refresh dashboard">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <Link href="/cases/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New case
            </Link>
          </div>
        </header>

        {error && (
          <p role="alert" className="p-3 text-sm text-error bg-error-container/30 border border-error/30 rounded">
            {error}
          </p>
        )}

        <section aria-label="Case statistics" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat icon={<FileText className="h-4 w-4" />} label="Total cases" value={stats?.total} />
          <Stat icon={<Clock className="h-4 w-4" />} label="Not yet analysed" value={stats?.pending} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Analysed" value={stats?.completed} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Analysis failed" value={stats?.failed} />
          <Stat icon={<Cpu className="h-4 w-4" />} label="With MRI images" value={stats?.withMri} />
        </section>

        <section aria-label="Urgency of latest analyses" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat label="Latest analysis: critical" value={stats?.latestAlertSeverity.critical} tone="critical" />
          <Stat label="Latest analysis: moderate" value={stats?.latestAlertSeverity.moderate} tone="moderate" />
          <Stat label="Latest analysis: low" value={stats?.latestAlertSeverity.low} />
        </section>

        {urgent.length > 0 && (
          <section className="bg-surface-container border border-error/30 rounded-xl p-5 space-y-3" aria-label="Recent cases needing attention">
            <h2 className="text-sm font-bold flex items-center gap-2 text-error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Recent cases whose latest analysis reported critical or moderate concerns
            </h2>
            <ul className="divide-y divide-outline-variant">
              {urgent.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <Link href={`/cases/${c.id}`} className="truncate hover:underline">
                    {c.caseTextPreview}
                  </Link>
                  <SeverityBadge severity={c.latestAnalysis?.alertSeverity ?? null} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden" aria-label="Recent cases">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant">
            <h2 className="text-sm font-bold">Recent cases</h2>
            <label className="text-xs text-on-surface-variant flex items-center gap-2">
              Filter recent cases
              <input value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-sm" />
            </label>
          </div>
          {loading && recent.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant" role="status">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">{recent.length === 0 ? 'No cases yet.' : 'No recent cases match the filter.'}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-on-surface-variant text-left">
                <tr>
                  <th className="p-3 font-medium">Case</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Severity</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 max-w-md truncate">{c.caseTextPreview}</td>
                    <td className="p-3 text-xs text-on-surface-variant whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                    <td className="p-3">
                      <CaseStatusBadge status={c.status} />
                    </td>
                    <td className="p-3">
                      <SeverityBadge severity={c.latestAnalysis?.alertSeverity ?? null} isMock={c.latestAnalysis?.isMock} />
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/cases/${c.id}`} className="text-primary inline-flex items-center gap-1 text-xs" aria-label="Open case">
                        Open <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-3 border-t border-outline-variant text-right">
            <Link href="/cases" className="text-xs text-primary hover:underline">
              View all cases
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number | undefined; icon?: React.ReactNode; tone?: 'critical' | 'moderate' }) {
  const color = tone === 'critical' ? 'text-error' : tone === 'moderate' ? 'text-amber-400' : 'text-on-surface';
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
      <div className="text-xs text-on-surface-variant flex items-center gap-2">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value === undefined ? '—' : value.toLocaleString()}</div>
    </div>
  );
}
