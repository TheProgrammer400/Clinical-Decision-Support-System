'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card, LoadState, PageHeader, useAdminData } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/format';
import type { AuditEntry } from '@/lib/admin-types';
import type { Paginated } from '@/lib/types';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<Paginated<AuditEntry>>(`/admin/audit-logs?page=${page}&limit=50`);
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={<ShieldAlert className="h-6 w-6 text-primary" />}
        title="Audit trail"
        description="Security and clinical access events. Rows cannot be modified or deleted through the database's normal write path. Clinical text is never logged."
        onRefresh={reload}
        loading={loading}
      />
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <Card>
            <table className="w-full text-xs">
              <thead className="text-left text-on-surface-variant">
                <tr>
                  <th className="py-2">Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.data.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                    <td className="font-mono text-primary">{l.action}</td>
                    <td>{l.actorUser?.email ?? 'system / anonymous'}</td>
                    <td className="font-mono">
                      {l.resourceType}:{l.resourceId.slice(0, 8)}
                    </td>
                    <td className="font-mono">{l.ipAddress ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center text-xs text-on-surface-variant pt-3">
              <span>
                Page {data.meta.page} of {Math.max(1, data.meta.totalPages)} ({data.meta.total} events)
              </span>
              <span className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">
                  Previous
                </button>
                <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">
                  Next
                </button>
              </span>
            </div>
          </Card>
        )}
      </LoadState>
    </div>
  );
}
