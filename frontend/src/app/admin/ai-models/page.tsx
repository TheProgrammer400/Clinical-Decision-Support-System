'use client';

import React from 'react';
import { Cpu } from 'lucide-react';
import { Card, LoadState, ms, PageHeader, StatTile, StatusPill, useAdminData } from '@/components/admin/ui';
import type { AiModels } from '@/lib/admin-types';

export default function AiModelsPage() {
  const { data, error, loading, reload } = useAdminData<AiModels>('/admin/ai-models');
  return (
    <div className="space-y-6 pb-12">
      <PageHeader icon={<Cpu className="h-6 w-6 text-primary" />} title="AI models" description="Request counts and latencies from stored analyses; MRI service status from a live probe." onRefresh={reload} loading={loading} />
      <LoadState loading={loading && !data} error={error}>
        {data && (
          <>
            <Card title={`Language model: ${data.llm.configuredModel}`}>
              <p className="text-xs text-on-surface-variant font-mono">
                Prompt {data.llm.promptVersion} ({data.llm.promptHash.slice(0, 12)}) · timeout {data.llm.timeoutMs / 1000} s
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Analyses (excl. mock)" value={data.llm.requestsTotal} />
                <StatTile label="Succeeded" value={data.llm.successful} />
                <StatTile label="Failed" value={data.llm.failed} />
                <StatTile label="Mean latency" value={ms(data.llm.avgLatencyMs)} />
              </div>
              {data.llm.byModelAndPrompt.length > 0 && (
                <table className="w-full text-xs mt-2">
                  <thead className="text-left text-on-surface-variant">
                    <tr>
                      <th>Model</th>
                      <th>Prompt</th>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.llm.byModelAndPrompt.map((r) => (
                      <tr key={`${r.modelName}-${r.promptVersion}-${r.status}`}>
                        <td className="font-mono py-1">{r.modelName}</td>
                        <td className="font-mono">{r.promptVersion}</td>
                        <td>{r.status}</td>
                        <td>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="MRI segmentation service">
              <div className="flex items-center gap-3 text-xs">
                <StatusPill status={data.mri.health.status} />
                <span>
                  {data.mri.health.modelVersion ?? 'model version unknown'} · {data.mri.health.device ?? 'device unknown'}
                  {data.mri.health.gpuName ? ` (${data.mri.health.gpuName})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Images processed" value={data.mri.total} />
                <StatTile label="Completed" value={data.mri.completed} />
                <StatTile label="Failed" value={data.mri.failed} />
                <StatTile label="Mean processing time" value={ms(data.mri.avgProcessingTimeMs)} />
              </div>
            </Card>
          </>
        )}
      </LoadState>
    </div>
  );
}
