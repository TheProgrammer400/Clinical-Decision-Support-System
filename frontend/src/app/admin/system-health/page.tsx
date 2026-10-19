'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { Card, LoadState, ms, PageHeader, StatusPill, useAdminData } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/format';
import type { SystemHealth } from '@/lib/admin-types';

export default function SystemHealthPage() {
  const { data, error, loading, reload } = useAdminData<SystemHealth>('/admin/system-health');
  return (
    <div className="space-y-6 pb-12">
      <PageHeader icon={<Activity className="h-6 w-6 text-primary" />} title="System health" description="Live probes run when this page loads." onRefresh={reload} loading={loading} />
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.components.map((c) => (
                <Card key={c.name}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{c.name}</span>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="text-xs text-on-surface-variant">Probe latency: {ms(c.latencyMs)}</p>
                  {c.detail && <p className="text-xs text-on-surface-variant">{c.detail}</p>}
                </Card>
              ))}
            </div>
            <Card title="Inference device (reported by the service)">
              <p className="text-xs">
                Device: {data.inference.device ?? 'unknown'} · GPU: {data.inference.gpuName ?? (data.inference.cudaAvailable === false ? 'none (CPU)' : 'unknown')} · Model version:{' '}
                {data.inference.modelVersion ?? 'unknown'}
              </p>
              <p className="text-[11px] text-on-surface-variant">GPU utilisation is not measured by this system.</p>
            </Card>
            <Card title="Audit log integrity">
              <p className="text-xs">
                Failed audit writes since server start: <strong>{data.auditWriteFailures}</strong>
                {data.lastAuditFailureAt ? ` (last at ${formatDateTime(data.lastAuditFailureAt)})` : ''}
              </p>
            </Card>
            <p className="text-[11px] text-on-surface-variant">Checked {formatDateTime(data.checkedAt)}</p>
          </>
        )}
      </LoadState>
    </div>
  );
}
