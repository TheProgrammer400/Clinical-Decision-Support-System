'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Card, LoadState, PageHeader, useAdminData } from '@/components/admin/ui';
import type { Settings } from '@/lib/admin-types';

export default function AdminSettingsPage() {
  const { data, error, loading } = useAdminData<Settings>('/admin/settings');
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 p-3 bg-surface-container-low rounded-lg text-xs font-mono">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-on-surface text-right break-all">{value}</span>
    </div>
  );
  return (
    <div className="space-y-6 pb-12">
      <PageHeader icon={<SettingsIcon className="h-6 w-6 text-primary" />} title="Configuration" description="Read-only view of the running server configuration. Change it through environment variables." />
      <LoadState loading={loading} error={error}>
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="AI">
              {row('LLM provider', data.llm.provider)}
              {row('LLM model', data.llm.model ?? 'n/a (mock)')}
              {row('LLM timeout', `${data.llm.timeoutMs / 1000} s`)}
              {row('Prompt version', data.prompt.version)}
              {row('Prompt hash', data.prompt.hash.slice(0, 16))}
            </Card>
            <Card title="Security & storage">
              {row('Max upload size', `${data.uploads.maxFileSizeMb} MB per file`)}
              {row('Max files per upload', data.uploads.maxFilesPerRequest)}
              {row('Allowed image formats', data.uploads.allowedFormats.join(', '))}
              {row('Access token lifetime', `${data.sessions.accessTokenTtlSeconds / 60} min`)}
              {row('Refresh token lifetime', `${(data.sessions.refreshTokenTtlSeconds / 86400).toFixed(1)} days`)}
              {row('MFA available', data.mfa.available ? 'yes' : 'no (MFA_ENCRYPTION_KEY not set)')}
              {row('Artifact storage', data.artifactStorage)}
            </Card>
          </div>
        )}
      </LoadState>
    </div>
  );
}
