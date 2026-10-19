'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthCard, BUTTON_CLASS, Field, INPUT_CLASS } from '@/components/auth/AuthCard';
import { apiClient } from '@/lib/api-client';
import { homeFor, RequireAuth, useSession } from '@/lib/session';

export default function SecurityPage() {
  return (
    <RequireAuth>
      <Security />
    </RequireAuth>
  );
}

function Security() {
  const { user, setUser } = useSession();
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!user) return null;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    }
  };

  return (
    <AuthCard title="Account security" subtitle={user.email} error={error}>
      {message && <p role="status" className="text-xs text-tertiary">{message}</p>}
      <p className="text-sm">
        Two-step verification is <strong>{user.mfaEnabled ? 'enabled' : 'not enabled'}</strong>.
      </p>

      {!user.mfaEnabled && !enrollment && (
        <button className={BUTTON_CLASS} onClick={() => run(async () => setEnrollment(await apiClient.beginMfaEnrollment()))}>
          Set up an authenticator app
        </button>
      )}

      {!user.mfaEnabled && enrollment && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await apiClient.confirmMfa(code);
              setUser({ ...user, mfaEnabled: true });
              setEnrollment(null);
              setCode('');
              setMessage('Two-step verification enabled.');
            });
          }}
        >
          <p className="text-xs text-on-surface-variant">
            Add this key to your authenticator app (manual entry, time-based), then enter the code it shows.
          </p>
          <code className="block break-all bg-surface-container-low border border-outline-variant rounded p-3 text-sm font-mono">{enrollment.secret}</code>
          <details className="text-[11px] text-on-surface-variant">
            <summary>Setup URI</summary>
            <code className="break-all">{enrollment.otpauthUri}</code>
          </details>
          <Field label="6-digit code">
            <input className={`${INPUT_CLASS} font-mono`} inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <button className={BUTTON_CLASS} disabled={code.length !== 6}>
            Confirm and enable
          </button>
        </form>
      )}

      {user.mfaEnabled && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await apiClient.disableMfa(code);
              setUser({ ...user, mfaEnabled: false });
              setCode('');
              setMessage('Two-step verification disabled.');
            });
          }}
        >
          <Field label="Enter a current code to disable two-step verification">
            <input className={`${INPUT_CLASS} font-mono`} inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <button className={BUTTON_CLASS} disabled={code.length !== 6}>
            Disable
          </button>
        </form>
      )}

      <div className="flex justify-between text-xs border-t border-outline-variant pt-4">
        <Link href="/account/password" className="text-primary hover:underline">
          Change password
        </Link>
        <Link href={homeFor(user)} className="text-on-surface-variant hover:underline">
          Back
        </Link>
      </div>
    </AuthCard>
  );
}
