'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, LayoutDashboard } from 'lucide-react';
import { Card, LoadState, ms, PageHeader, StatTile, StatusPill, useAdminData } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/format';
import type { DashboardStats, Analytics } from '@/lib/admin-types';

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useAdminData<DashboardStats>('/admin/dashboard-stats');
  const analytics = useAdminData<Analytics>('/admin/analytics?days=30');

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={<LayoutDashboard className="h-6 w-6 text-primary" />}
        title="Administration overview"
        description={data?.scope === 'all_organizations' ? 'All organizations.' : 'Your organization only.'}
        onRefresh={() => {
          reload();
          analytics.reload();
        }}
        loading={loading}
      />
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatTile label="Approved doctors" value={data.topStats.totalDoctors} />
              <StatTile label="Clinical cases" value={data.topStats.totalQueries} />
              <StatTile label="MRI images" value={data.topStats.mriAnalysesCount} />
              <StatTile label="Pending registrations" value={data.topStats.pendingRegistrationsCount} />
              <StatTile label="Active alerts" value={data.topStats.activeAlertsCount} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile label="Doctors active this month" value={data.secondaryStats.activeDoctorsThisMonth} />
              <StatTile label="Cases today" value={data.secondaryStats.queriesToday} />
              <StatTile
                label="Analyses today (succeeded / failed)"
                value={`${data.secondaryStats.analysesSucceededToday} / ${data.secondaryStats.analysesFailedToday}`}
                hint="Excludes development mock output"
              />
              <StatTile label="Mean analysis latency today" value={ms(data.secondaryStats.avgAnalysisLatencyMsToday)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Cases per day (last 30 days)">
                <LoadState loading={analytics.loading && !analytics.data} error={analytics.error}>
                  {analytics.data && <DailyBars points={analytics.data.casesPerDay} />}
                </LoadState>
              </Card>
              <Card title="Active alerts">
                {data.activeAlerts.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No active alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.activeAlerts.map((a) => (
                      <li key={a.id} className={`p-3 rounded border text-xs ${a.severity === 'critical' ? 'border-error/40 text-error' : 'border-amber-500/40 text-amber-300'}`}>
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          {a.title}
                        </div>
                        <div className="text-on-surface-variant mt-0.5">{a.message}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card title="Component health (measured now)">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-outline-variant">
                  {data.systemHealth.components.map((c) => (
                    <tr key={c.name}>
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="py-2 font-mono">{ms(c.latencyMs)}</td>
                      <td className="py-2 text-on-surface-variant">{c.detail ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Recent audit events">
              <ul className="divide-y divide-outline-variant text-xs">
                {data.recentAuditLogs.map((l) => (
                  <li key={l.id} className="py-2 flex flex-wrap gap-x-4">
                    <span className="font-mono text-primary">{l.action}</span>
                    <span>{l.actorUser?.email ?? 'system'}</span>
                    <span className="text-on-surface-variant">{formatDateTime(l.createdAt)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/audit-logs" className="text-xs text-primary hover:underline">
                Full audit trail
              </Link>
            </Card>
          </>
        )}
      </LoadState>
    </div>
  );
}

function DailyBars({ points }: { points: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div>
      <div className="h-40 flex items-end gap-1" role="img" aria-label={`Cases per day; maximum ${max} per day`}>
        {points.map((p) => (
          <div key={p.date} title={`${p.date}: ${p.count}`} className="flex-1 bg-primary/60 rounded-t" style={{ height: `${(p.count / max) * 100}%`, minHeight: p.count ? 2 : 0 }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-on-surface-variant mt-1 font-mono">
        <span>{points[0]?.date}</span>
        <span>max {max}/day</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
