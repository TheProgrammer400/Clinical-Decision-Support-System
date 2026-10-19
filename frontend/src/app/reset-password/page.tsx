'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard, BUTTON_CLASS, Field, INPUT_CLASS } from '@/components/auth/AuthCard';
import { apiClient } from '@/lib/api-client';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 12) return setError('The password must be at least 12 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await apiClient.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The password could not be reset.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <AuthCard title="Reset password" error="This page needs a reset link issued by your administrator." >{null}</AuthCard>;
  }
  if (done) {
    return (
      <AuthCard title="Password updated">
        <p role="status" className="text-sm">Your password has been changed and all previous sessions were signed out.</p>
        <Link href="/login" className="text-primary text-sm hover:underline">
          Sign in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" subtitle="Reset links are single-use and expire after one hour." error={error}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 12 characters.">
          <input className={INPUT_CLASS} type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <input className={INPUT_CLASS} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button className={BUTTON_CLASS} disabled={busy}>
          {busy ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </AuthCard>
  );
}
