'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard, BUTTON_CLASS, Field, INPUT_CLASS } from '@/components/auth/AuthCard';
import { apiClient } from '@/lib/api-client';
import { homeFor, RequireAuth, useSession } from '@/lib/session';

export default function ChangePasswordPage() {
  return (
    <RequireAuth>
      <ChangePasswordForm />
    </RequireAuth>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 12) return setError('The new password must be at least 12 characters.');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      const updated = await apiClient.changePassword(current, next);
      router.replace(homeFor(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Change password"
      subtitle={user?.mustChangePassword ? 'You must set a new password before continuing.' : 'All other sessions will be signed out.'}
      error={error}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password">
          <input className={INPUT_CLASS} type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          <input className={INPUT_CLASS} type="password" required minLength={12} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <input className={INPUT_CLASS} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button className={BUTTON_CLASS} disabled={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </AuthCard>
  );
}
