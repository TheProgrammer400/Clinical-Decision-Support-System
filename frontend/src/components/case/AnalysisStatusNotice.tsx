import React from 'react';
import { AlertTriangle, Clock, FlaskConical, Loader2 } from 'lucide-react';
import type { Analysis, CaseStatus } from '@/lib/types';
import { ANALYSIS_STATUS_LABEL } from '@/lib/format';

const ERROR_EXPLANATIONS: Record<string, string> = {
  LLM_TIMEOUT: 'The language model did not respond in time.',
  LLM_RATE_LIMITED: 'The language model service is rate-limiting requests.',
  LLM_UNAVAILABLE: 'The language model service was unavailable.',
  LLM_EMPTY_RESPONSE: 'The language model returned an empty response.',
  LLM_REQUEST_REJECTED: 'The language model service rejected the request.',
  OUTPUT_INVALID: 'The model output did not match the required clinical schema, even after one corrective retry.',
};

/**
 * Explains the state of the selected analysis. Anything other than a successful, real analysis
 * is announced prominently so it cannot be mistaken for clinical output.
 */
export function AnalysisStatusNotice({ analysis, caseStatus }: { analysis: Analysis | null; caseStatus: CaseStatus }) {
  if (caseStatus === 'ANALYZING') {
    return (
      <Notice tone="info" icon={<Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} title="Analysis in progress">
        An analysis is currently running for this case. Refresh in a moment to see the result.
      </Notice>
    );
  }
  if (!analysis) {
    return (
      <Notice tone="info" icon={<Clock className="h-5 w-5" aria-hidden="true" />} title="No analysis yet">
        This case has not been analysed. No decision-support output exists for it.
      </Notice>
    );
  }
  if (analysis.status !== 'SUCCESS') {
    return (
      <Notice tone="error" icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />} title={`Analysis failed: no result was produced`}>
        {ANALYSIS_STATUS_LABEL[analysis.status] ?? analysis.status}.{' '}
        {(analysis.errorCode && ERROR_EXPLANATIONS[analysis.errorCode]) || 'The analysis could not be completed.'} No diagnoses,
        alerts or recommendations are shown because none were generated. You can re-run the analysis.
      </Notice>
    );
  }
  if (analysis.isMock) {
    return (
      <Notice tone="warning" icon={<FlaskConical className="h-5 w-5" aria-hidden="true" />} title="Synthetic output from the development mock">
        This result was produced by the development mock provider, not by a language model. It contains no assessment of this
        patient and must not be used clinically.
      </Notice>
    );
  }
  return null;
}

function Notice({ tone, icon, title, children }: { tone: 'info' | 'warning' | 'error'; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const styles = {
    info: 'bg-surface-container border-outline-variant text-on-surface',
    warning: 'bg-amber-950/30 border-amber-500/40 text-amber-100',
    error: 'bg-error-container/40 border-error/40 text-on-error-container',
  }[tone];
  return (
    <div role={tone === 'info' ? 'status' : 'alert'} className={`w-full rounded-xl border p-4 flex items-start gap-3 ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs leading-relaxed mt-1 opacity-90">{children}</p>
      </div>
    </div>
  );
}
