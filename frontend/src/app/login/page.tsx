'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthCard, BUTTON_CLASS, Field, INPUT_CLASS } from '@/components/auth/AuthCard';
import { apiClient } from '@/lib/api-client';
import { homeFor, useSession } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

/** Only same-origin relative paths are accepted as redirect targets. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const proceed = (u: SessionUser) => {
    if (u.mustChangePassword) router.replace('/account/password');
    else router.replace(safeNext(params.get('next')) ?? homeFor(u));
  };

  useEffect(() => {
    if (!sessionLoading && user) proceed(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, user]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await apiClient.login(email, password);
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setPassword('');
      } else {
        proceed(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setBusy(true);
    try {
      proceed(await apiClient.completeMfaLogin(mfaToken, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (mfaToken) {
    return (
      <AuthCard title="Two-step verification" subtitle="Enter the 6-digit code from your authenticator app." error={error}>
        <form onSubmit={submitCode} className="space-y-4">
          <Field label="Verification code">
            <input
              className={`${INPUT_CLASS} font-mono tracking-[0.4em] text-center`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <button className={BUTTON_CLASS} disabled={busy || code.length !== 6}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button type="button" className="w-full text-xs text-on-surface-variant hover:underline" onClick={() => setMfaToken(null)}>
            Use a different account
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in" subtitle="Clinician and administrator access." error={error}>
      <form onSubmit={submitPassword} className="space-y-4">
        <Field label="Email">
          <input className={INPUT_CLASS} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className={INPUT_CLASS} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className={BUTTON_CLASS} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
      <p className="text-xs text-on-surface-variant text-center border-t border-outline-variant pt-4">
        Need an account?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Request access
        </Link>
        . Forgotten passwords are reset by your administrator.
      </p>
    </AuthCard>
  );
}
