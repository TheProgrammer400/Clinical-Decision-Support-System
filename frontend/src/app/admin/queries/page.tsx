'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import { Card, LoadState, ms, PageHeader, useAdminData } from '@/components/admin/ui';
import { CASE_STATUS_LABEL, formatDateTime } from '@/lib/format';
import type { Paginated } from '@/lib/types';

interface QueryRow {
  id: string;
  doctorName: string;
  doctorEmail: string;
  mriCount: number;
  status: string;
  createdAt: string;
  analysisStatus: string | null;
  modelName: string | null;
  isMock: boolean;
  latencyMs: number | null;
}

export default function AdminQueriesPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<Paginated<QueryRow>>(`/admin/queries?page=${page}&limit=25`);
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={<FileSpreadsheet className="h-6 w-6 text-primary" />}
        title="Clinical queries"
        description="Operational view of case processing. Clinical text is not shown here; opening a case is audited."
        onRefresh={reload}
        loading={loading}
      />
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <Card>
            <table className="w-full text-xs">
              <thead className="text-left text-on-surface-variant">
                <tr>
                  <th className="py-2">Created</th>
                  <th>Doctor</th>
                  <th>Case status</th>
                  <th>Latest analysis</th>
                  <th>Model</th>
                  <th>Latency</th>
                  <th>MRI</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.data.map((q) => (
                  <tr key={q.id}>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(q.createdAt)}</td>
                    <td>{q.doctorName}</td>
                    <td>{CASE_STATUS_LABEL[q.status] ?? q.status}</td>
                    <td>{q.analysisStatus ?? '—'}{q.isMock ? ' (mock)' : ''}</td>
                    <td className="font-mono">{q.modelName ?? '—'}</td>
                    <td>{ms(q.latencyMs)}</td>
                    <td>{q.mriCount}</td>
                    <td>
                      <Link href={`/cases/${q.id}`} className="text-primary">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-xs text-on-surface-variant pt-3">
              <span>
                Page {data.meta.page} of {Math.max(1, data.meta.totalPages)} ({data.meta.total} cases)
              </span>
              <span className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Previous</button>
                <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Next</button>
              </span>
            </div>
          </Card>
        )}
      </LoadState>
    </div>
  );
}
