'use client';

import React from 'react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { errorMessage, useResource } from '@/lib/use-resource';

/** Loads admin data from the API with explicit loading/error state (no placeholder numbers). */
export function useAdminData<T>(path: string) {
  const { data, error, loading, reload } = useResource(() => apiClient.get<T>(path), path);
  return { data, error: errorMessage(error, 'Request failed'), loading, reload };
}

export function PageHeader({ icon, title, description, onRefresh, loading }: { icon: React.ReactNode; title: string; description: string; onRefresh?: () => void; loading?: boolean }) {
  return (
    <div className="p-6 glass-panel rounded-2xl border border-outline-variant flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">{description}</p>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      )}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3 ${className}`}>
      {title && <h2 className="text-sm font-bold text-on-surface">{title}</h2>}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="text-2xl font-bold font-mono text-on-surface mt-1">{value}</div>
      {hint && <div className="text-[11px] text-on-surface-variant mt-1">{hint}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const style =
    status === 'healthy'
      ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
      : status === 'down'
        ? 'bg-error-container/40 text-error border-error/30'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase border ${style}`}>{status.replace('_', ' ')}</span>;
}

export function LoadState({ loading, error, children }: { loading: boolean; error: string | null; children: React.ReactNode }) {
  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl border border-error/30 bg-error-container/30 text-sm text-error flex items-center gap-2">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div role="status" className="min-h-[30vh] flex items-center justify-center gap-2 text-sm text-on-surface-variant">
        <Activity className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}

export const ms = (v: number | null | undefined) => (v === null || v === undefined ? 'Not measured' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);
