import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';

/** Shared layout for sign-in, registration and password pages. */
export function AuthCard({ title, subtitle, error, children }: { title: string; subtitle?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="bg-background text-on-surface min-h-[85vh] flex flex-col items-center justify-center px-4 py-10 font-body antialiased">
      <main className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Activity className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <span className="text-xl font-headline font-bold">CDSS</span>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
          <div>
            <h1 className="text-lg font-bold text-on-surface">{title}</h1>
            {subtitle && <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>}
          </div>
          {error && (
            <div role="alert" className="p-3 bg-error-container/40 border border-error/30 rounded flex items-start gap-2 text-on-error-container text-xs">
              <AlertCircle className="h-4 w-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>
        <p className="text-center text-[11px] text-on-surface-variant">
          Decision support for licensed clinicians. Not a diagnostic device; outputs require independent clinical judgment.
        </p>
      </main>
    </div>
  );
}

export const INPUT_CLASS =
  'w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary';
export const BUTTON_CLASS =
  'w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-medium py-2.5 rounded flex items-center justify-center gap-2 disabled:opacity-50';

/** Labelled form field. The hint is linked via aria-describedby so it is not part of the accessible name. */
export function Field({ label, children, hint }: { label: string; children: React.ReactElement<{ id?: string; 'aria-describedby'?: string }>; hint?: string }) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const control = React.cloneElement(children, { id, 'aria-describedby': hint ? hintId : undefined });
  return (
    <div className="space-y-1.5 text-xs font-medium text-on-surface-variant">
      <label htmlFor={id} className="block">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-[11px] font-normal">
          {hint}
        </p>
      )}
    </div>
  );
}
