/**
 * Formats a measurement for display. Missing values render as an explicit placeholder and a
 * genuine zero stays "0" (never `value || fallback`, which turns 0 into a made-up number).
 */
export function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Not available';
  }
  return value.toLocaleString(undefined, options);
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'Not available' : `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export const ANALYSIS_STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'Completed',
  VALIDATION_FAILED: 'Failed – invalid model output',
  GROQ_ERROR: 'Failed – model service error',
};

export const CASE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Not analysed',
  ANALYZING: 'Analysing',
  COMPLETED: 'Analysed',
  FAILED: 'Analysis failed',
};
