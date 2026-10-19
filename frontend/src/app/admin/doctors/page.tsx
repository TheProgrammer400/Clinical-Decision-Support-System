'use client';

import React, { useState } from 'react';
import { KeyRound, Users } from 'lucide-react';
import { Card, LoadState, PageHeader, useAdminData } from '@/components/admin/ui';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Doctor } from '@/lib/admin-types';

export default function AdminDoctorsPage() {
  const { user } = useSession();
  const { data, error, loading, reload } = useAdminData<Doctor[]>('/admin/doctors');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<{ email: string; url: string; expiresAt: string } | null>(null);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (d: Doctor) =>
    act(d.id, async () => {
      const next = d.status === 'Active' ? 'Suspended' : 'Active';
      if (next === 'Suspended' && !window.confirm(`Suspend ${d.fullName}? All of their sessions end immediately.`)) return;
      await apiClient.patch(`/admin/doctors/${d.id}/status`, { status: next });
    });

  const issueReset = (d: Doctor) =>
    act(d.id, async () => {
      const res = await apiClient.post<{ resetPath: string; expiresAt: string }>(`/admin/users/${d.id}/password-reset`);
      setResetLink({ email: d.email, url: `${window.location.origin}${res.resetPath}`, expiresAt: res.expiresAt });
    });

  const promote = (d: Doctor) =>
    act(d.id, async () => {
      if (!window.confirm(`Make ${d.fullName} an organization administrator?`)) return;
      await apiClient.patch(`/admin/users/${d.id}/role`, { role: 'ORG_ADMIN' });
    });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader icon={<Users className="h-6 w-6 text-primary" />} title="Doctors" description="Approved doctor accounts you are allowed to manage." onRefresh={reload} loading={loading} />
      {actionError && <p role="alert" className="text-sm text-error">{actionError}</p>}
      {resetLink && (
        <Card title={`One-time password reset link for ${resetLink.email}`}>
          <p className="text-xs text-on-surface-variant">
            Shown once. Deliver it to the user through a trusted channel. It expires {formatDateTime(resetLink.expiresAt)} and stops working after use.
          </p>
          <code className="block break-all text-xs bg-surface-container-low p-3 rounded border border-outline-variant">{resetLink.url}</code>
          <button className="text-xs text-primary" onClick={() => setResetLink(null)}>
            Dismiss
          </button>
        </Card>
      )}
      <LoadState loading={loading && !data} error={error}>
        <Card>
          {data && data.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No doctors.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-on-surface-variant">
                <tr>
                  <th className="py-2">Doctor</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Cases (with MRI)</th>
                  <th>Last sign-in</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data?.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2">
                      <div className="font-medium">{d.fullName}</div>
                      <div className="text-on-surface-variant font-mono">{d.email}</div>
                    </td>
                    <td>{d.organizationName ?? '—'}</td>
                    <td className={d.status === 'Active' ? 'text-tertiary' : 'text-error'}>{d.status}</td>
                    <td>{d.mfaEnabled ? 'Yes' : 'No'}</td>
                    <td>
                      {d.queriesCount} ({d.mriQueriesCount})
                    </td>
                    <td>{d.lastLoginAt ? formatDateTime(d.lastLoginAt) : 'Never'}</td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      <button disabled={busyId === d.id} onClick={() => toggle(d)} className="px-2 py-1 border border-outline-variant rounded disabled:opacity-40">
                        {d.status === 'Active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button disabled={busyId === d.id} onClick={() => issueReset(d)} className="px-2 py-1 border border-outline-variant rounded inline-flex items-center gap-1 disabled:opacity-40">
                        <KeyRound className="h-3 w-3" aria-hidden="true" /> Reset link
                      </button>
                      {user?.role === 'SUPER_ADMIN' && d.organizationName && (
                        <button disabled={busyId === d.id} onClick={() => promote(d)} className="px-2 py-1 border border-outline-variant rounded disabled:opacity-40">
                          Make org admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </LoadState>
    </div>
  );
}
