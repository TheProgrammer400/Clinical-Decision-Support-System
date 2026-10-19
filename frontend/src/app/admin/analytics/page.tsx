'use client';

import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, LoadState, ms, PageHeader, StatTile, useAdminData } from '@/components/admin/ui';
import type { Analytics } from '@/lib/admin-types';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useAdminData<Analytics>(`/admin/analytics?days=${days}`);
  const pct = (v: number | null) => (v === null ? 'No data' : `${(v * 100).toFixed(1)}%`);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader icon={<BarChart3 className="h-6 w-6 text-primary" />} title="Usage analytics" description="Computed from stored cases, analyses and feedback." onRefresh={reload} loading={loading} />
      <div className="flex gap-2" role="radiogroup" aria-label="Time range">
        {[7, 30, 90].map((d) => (
          <button key={d} role="radio" aria-checked={days === d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded border text-xs ${days === d ? 'border-primary text-primary' : 'border-outline-variant'}`}>
            {d} days
          </button>
        ))}
      </div>
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile label="Cases" value={data.totalCases} />
              <StatTile label="Cases with MRI" value={data.casesWithMri} hint={data.totalCases ? `${((data.casesWithMri / data.totalCases) * 100).toFixed(1)}% of cases` : undefined} />
              <StatTile label="Analysis success rate" value={pct(data.successRate)} hint={`${data.analyses.succeeded} of ${data.analyses.total} (mock excluded)`} />
              <StatTile label="Mean analysis latency" value={ms(data.analyses.avgLatencyMs)} />
            </div>
            <Card title="Doctor feedback by model and prompt version">
              {data.feedback.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No feedback in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-left text-on-surface-variant">
                    <tr>
                      <th className="py-1">Model</th>
                      <th>Prompt</th>
                      <th>Helpful</th>
                      <th>Partially</th>
                      <th>Not helpful</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {data.feedback.map((f) => (
                      <tr key={`${f.modelName}-${f.promptVersion}`}>
                        <td className="py-2 font-mono">{f.modelName}</td>
                        <td className="font-mono">{f.promptVersion}</td>
                        <td>{f.HELPFUL}</td>
                        <td>{f.PARTIALLY_HELPFUL}</td>
                        <td>{f.NOT_HELPFUL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}
      </LoadState>
    </div>
  );
}
