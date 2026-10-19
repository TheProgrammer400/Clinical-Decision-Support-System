'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, LoadState, PageHeader, useAdminData } from '@/components/admin/ui';
import type { DashboardStats } from '@/lib/admin-types';

export default function AdminAlertsPage() {
  const { data, error, loading, reload } = useAdminData<DashboardStats>('/admin/dashboard-stats');
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={<AlertTriangle className="h-6 w-6 text-amber-400" />}
        title="Active alerts"
        description="Derived from current failure counts, component health probes and audit-write failures. There is no alert history yet."
        onRefresh={reload}
        loading={loading}
      />
      <LoadState loading={loading && !data} error={error}>
        <Card>
          {data && data.activeAlerts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No active alerts.</p>
          ) : (
            <ul className="space-y-3">
              {data?.activeAlerts.map((a) => (
                <li key={a.id} className={`p-4 rounded-xl border ${a.severity === 'critical' ? 'border-error/40' : 'border-amber-500/40'}`}>
                  <div className={`font-bold text-sm ${a.severity === 'critical' ? 'text-error' : 'text-amber-300'}`}>{a.title}</div>
                  <p className="text-xs text-on-surface-variant mt-1">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </LoadState>
    </div>
  );
}
