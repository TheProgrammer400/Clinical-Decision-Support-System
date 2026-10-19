'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Download, FileText, HelpCircle, Printer, RefreshCw, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { AnalysisResultView } from '@/components/case/AnalysisResultView';
import { AnalysisStatusNotice } from '@/components/case/AnalysisStatusNotice';
import { MriPanel } from '@/components/case/MriPanel';
import { SafetyFlagsNotice } from '@/components/case/SafetyFlagsNotice';
import { ApiError, apiClient } from '@/lib/api-client';
import { ANALYSIS_STATUS_LABEL, formatDateTime } from '@/lib/format';
import { RequireAuth } from '@/lib/session';
import type { Analysis, CaseDetail, FeedbackRating } from '@/lib/types';

const CONTEXT_LABELS: Record<string, Record<string, string>> = {
  ageGroup: { pediatric: 'Pediatric (0-17)', adult: 'Adult (18-64)', geriatric: 'Geriatric (65+)', not_specified: 'Not specified' },
  sex: { m: 'Male', f: 'Female', other: 'Other/undetermined', not_specified: 'Not specified' },
  acuity: { hyperacute: 'Hyperacute (< 24h)', acute: 'Acute (1-7 days)', subacute: 'Subacute (1-4 weeks)', chronic: 'Chronic (> 4 weeks)', not_specified: 'Not specified' },
};

export default function CaseDetailPage() {
  return (
    <RequireAuth>
      <CaseDetailContent />
    </RequireAuth>
  );
}

function CaseDetailContent() {
  const params = useParams();
  const caseId = params.id as string;

  const [clinicalCase, setClinicalCase] = useState<CaseDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCase(caseId);
      setClinicalCase(data);
      setSelectedId(data.analyses[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? 'This case does not exist or you do not have access to it.' : 'The case could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    setActionError(null);
    try {
      await apiClient.analyzeCase(caseId);
    } catch (err) {
      // A failed run is recorded server-side and shown after reload.
      if (!(err instanceof ApiError && err.code === 'ANALYSIS_FAILED')) {
        setActionError(err instanceof Error ? err.message : 'Re-analysis failed.');
      }
    } finally {
      await load();
      setReanalyzing(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiClient.exportCase(caseId);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cdss-case-${caseId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  if (loading && !clinicalCase) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-screen" role="status">
          <Activity className="h-10 w-10 text-primary animate-spin" aria-hidden="true" />
          <div className="text-on-surface-variant text-sm font-medium">Loading clinical case…</div>
        </div>
      </Shell>
    );
  }

  if (error || !clinicalCase) {
    return (
      <Shell>
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div role="alert" className="p-8 bg-surface-container rounded-xl border border-error/30 text-center space-y-4 max-w-lg">
            <AlertTriangle className="h-12 w-12 text-error mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold text-on-surface">Case unavailable</h2>
            <p className="text-sm text-on-surface-variant">{error}</p>
            <Link href="/cases" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-sm font-medium">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to case history
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const selected: Analysis | null = clinicalCase.analyses.find((a) => a.id === selectedId) ?? null;
  const ctx = clinicalCase.patientContext;

  return (
    <Shell>
      <main className="flex-1 w-full min-w-0 p-6 md:p-8 lg:p-10 space-y-8 pb-24">
        <header className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2 text-xs text-on-surface-variant">
              <span className="px-2.5 py-0.5 rounded font-mono bg-surface-container-high text-primary border border-outline-variant">ID #{clinicalCase.id.slice(0, 8)}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDateTime(clinicalCase.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                {clinicalCase.doctor.fullName}
              </span>
            </div>
            <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Case Analysis Record</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-outline-variant text-sm font-medium">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-outline-variant text-sm font-medium">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </button>
            {clinicalCase.canAct && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing || clinicalCase.status === 'ANALYZING'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {reanalyzing ? 'Analysing…' : clinicalCase.analyses.length ? 'Re-run analysis' : 'Run analysis'}
              </button>
            )}
          </div>
        </header>

        {actionError && (
          <p role="alert" className="text-sm text-error bg-error-container/30 border border-error/30 rounded-lg p-3">
            {actionError}
          </p>
        )}

        <section className="w-full bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3" aria-label="Clinical narrative">
          <h2 className="text-xs font-mono font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Clinician-entered information
          </h2>
          <p className="font-mono bg-surface-container-lowest p-4 rounded border border-outline/30 text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {clinicalCase.caseText}
          </p>
          {ctx && (
            <dl className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {(['ageGroup', 'sex', 'acuity'] as const).map((k) => (
                <div key={k} className="bg-surface-container-low rounded border border-outline-variant p-2">
                  <dt className="text-on-surface-variant">{k === 'ageGroup' ? 'Age group' : k === 'sex' ? 'Sex' : 'Acuity'}</dt>
                  <dd className="text-on-surface font-semibold">{CONTEXT_LABELS[k][ctx[k]] ?? ctx[k]}</dd>
                </div>
              ))}
              <div className="bg-surface-container-low rounded border border-outline-variant p-2">
                <dt className="text-on-surface-variant">History</dt>
                <dd className="text-on-surface font-semibold">{ctx.historyTags?.length ? ctx.historyTags.join(', ') : 'None entered'}</dd>
              </div>
            </dl>
          )}
        </section>

        {clinicalCase.analyses.length > 1 && (
          <AnalysisHistory analyses={clinicalCase.analyses} selectedId={selectedId} onSelect={setSelectedId} />
        )}

        <AnalysisStatusNotice analysis={selected} caseStatus={clinicalCase.status} />

        {selected && <Provenance analysis={selected} />}

        {selected?.status === 'SUCCESS' && selected.result && (
          <>
            <SafetyFlagsNotice flags={selected.safetyFlags} />
            <AnalysisResultView result={selected.result} />
          </>
        )}

        <MriPanel caseId={clinicalCase.id} analyses={clinicalCase.mriAnalyses} />

        {selected?.status === 'SUCCESS' && clinicalCase.canAct && !selected.isMock && <FeedbackBar analysisId={selected.id} />}
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased">
      <DoctorSidebar />
      {children}
    </div>
  );
}

function AnalysisHistory({ analyses, selectedId, onSelect }: { analyses: Analysis[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <section className="w-full bg-surface-container border border-outline-variant rounded-xl p-4 space-y-2" aria-label="Analysis history">
      <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Analysis runs ({analyses.length})</h2>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select analysis run">
        {analyses.map((a, i) => (
          <button
            key={a.id}
            role="radio"
            aria-checked={a.id === selectedId}
            onClick={() => onSelect(a.id)}
            className={`px-3 py-1.5 rounded-md border text-xs ${a.id === selectedId ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'}`}
          >
            {i === 0 ? 'Latest' : `Run ${analyses.length - i}`} · {formatDateTime(a.createdAt)} · {a.status === 'SUCCESS' ? (a.result?.alert ? `severity ${a.result.alert.severity}` : 'completed') : 'failed'}
            {a.isMock ? ' · mock' : ''}
          </button>
        ))}
      </div>
    </section>
  );
}

function Provenance({ analysis }: { analysis: Analysis }) {
  return (
    <p className="text-[11px] text-on-surface-variant font-mono">
      {ANALYSIS_STATUS_LABEL[analysis.status] ?? analysis.status} · model {analysis.modelName} · prompt {analysis.promptVersion}
      {analysis.promptHash ? ` (${analysis.promptHash.slice(0, 12)})` : ''}
      {analysis.latencyMs !== null ? ` · ${(analysis.latencyMs / 1000).toFixed(1)} s` : ''} · {formatDateTime(analysis.createdAt)}
    </p>
  );
}

function FeedbackBar({ analysisId }: { analysisId: string }) {
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSubmitted(false);
    setComment('');
    setError(null);
  }, [analysisId]);

  const submit = async (rating: FeedbackRating) => {
    try {
      setError(null);
      await apiClient.submitFeedback(analysisId, rating, comment.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback could not be saved.');
    }
  };

  return (
    <section className="w-full bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-5" aria-label="Feedback">
      <div>
        <h2 className="text-sm font-bold text-on-surface">Was this output useful?</h2>
        <p className="text-xs text-on-surface-variant mt-0.5">Feedback is recorded per model and prompt version for quality review.</p>
        {error && <p role="alert" className="text-xs text-error mt-1">{error}</p>}
      </div>
      {submitted ? (
        <p role="status" className="p-3 bg-tertiary-container/20 border border-tertiary/30 rounded-lg text-tertiary text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Feedback recorded. Thank you.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => submit('HELPFUL')} className="flex items-center gap-1.5 px-3.5 py-2 bg-tertiary-container/20 border border-tertiary/30 text-tertiary rounded-lg text-xs font-semibold">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Helpful
            </button>
            <button onClick={() => submit('PARTIALLY_HELPFUL')} className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> Partially
            </button>
            <button onClick={() => submit('NOT_HELPFUL')} className="flex items-center gap-1.5 px-3.5 py-2 bg-error-container/40 border border-error/30 text-error rounded-lg text-xs font-semibold">
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" /> Not helpful
            </button>
          </div>
          <label className="w-full sm:w-64">
            <span className="sr-only">Optional comment</span>
            <input
              type="text"
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface text-xs focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      )}
    </section>
  );
}
