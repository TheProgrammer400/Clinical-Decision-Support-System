import React from 'react';
import { CASE_STATUS_LABEL } from '@/lib/format';
import type { CaseStatus, Severity } from '@/lib/types';

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const style =
    status === 'COMPLETED'
      ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
      : status === 'FAILED'
        ? 'bg-error-container/40 text-error border-error/30'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${style}`}>{CASE_STATUS_LABEL[status] ?? status}</span>;
}

export function SeverityBadge({ severity, isMock }: { severity: Severity | null; isMock?: boolean }) {
  if (isMock) {
    return <span className="px-2 py-0.5 rounded text-[11px] border border-amber-500/40 text-amber-300">Mock output</span>;
  }
  if (!severity) {
    return <span className="text-[11px] text-on-surface-variant">—</span>;
  }
  const style =
    severity === 'critical'
      ? 'bg-error-container/40 text-error border-error/30'
      : severity === 'moderate'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-tertiary/10 text-tertiary border-tertiary/30';
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase border ${style}`}>{severity}</span>;
}
