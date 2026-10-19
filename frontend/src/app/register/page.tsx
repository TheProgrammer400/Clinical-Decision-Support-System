'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AuthCard, BUTTON_CLASS, Field, INPUT_CLASS } from '@/components/auth/AuthCard';
import { apiClient } from '@/lib/api-client';

const PASSWORD_MIN = 12;

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', fullName: '', organizationName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < PASSWORD_MIN) return setError(`Password must be at least ${PASSWORD_MIN} characters.`);
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const res = await apiClient.register({ ...form, organizationName: form.organizationName.trim() || undefined });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Request received">
        <p role="status" className="text-sm text-on-surface flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-tertiary shrink-0" aria-hidden="true" />
          {done}
        </p>
        <Link href="/login" className="text-primary text-sm hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Request clinician access" subtitle="Accounts are activated after administrator approval." error={error}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <input className={INPUT_CLASS} required maxLength={200} autoComplete="name" value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email">
          <input className={INPUT_CLASS} type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Organization (optional)" hint="Creates a new organization; leave empty to join without one.">
          <input className={INPUT_CLASS} maxLength={200} value={form.organizationName} onChange={set('organizationName')} />
        </Field>
        <Field label="Password" hint={`At least ${PASSWORD_MIN} characters.`}>
          <input className={INPUT_CLASS} type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password">
          <input className={INPUT_CLASS} type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} />
        </Field>
        <button className={BUTTON_CLASS} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      <p className="text-xs text-on-surface-variant text-center">
        Already approved?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
