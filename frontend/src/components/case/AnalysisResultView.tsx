import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  Info,
  ListOrdered,
  MinusCircle,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import type { ClinicalResult, Severity } from '@/lib/types';

const NOT_PROVIDED = 'Not provided by the model.';

const SEVERITY_TITLE: Record<Severity, string> = {
  critical: 'CRITICAL — URGENT EMERGENCY RULE-OUTS',
  moderate: 'MODERATE — CLINICAL CONCERNS TO MONITOR',
  low: 'LOW — NO IMMEDIATE RED FLAGS LISTED',
};

/** Renders a validated, successful analysis. Every value shown comes from `result`. */
export function AnalysisResultView({ result }: { result: ClinicalResult }) {
  return (
    <div className="space-y-8">
      <AlertPanel result={result} />

      <div className="w-full bg-surface-container border-l-4 border-tertiary p-4 rounded-r-lg border-y border-r border-outline-variant flex items-start gap-3">
        <Info className="h-5 w-5 text-tertiary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-bold text-on-surface mb-1">Clinical Safety Disclaimer</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {result.disclaimer ??
              'AI-generated clinical decision support. Not a diagnosis. Independent clinical judgment by a licensed professional is required.'}
          </p>
        </div>
      </div>

      <Differentials items={result.differential_diagnoses} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
            Case Synthesis &amp; Key Findings
          </h3>
          <p className="text-sm text-on-surface leading-relaxed border-l-2 border-primary pl-4 py-1">{result.case_summary}</p>
          <ItemList
            label="Key Clinical Findings"
            items={result.key_clinical_findings}
            empty="The model did not list key findings."
            icon={<CheckCircle2 className="h-4 w-4 text-tertiary shrink-0 mt-0.5" aria-hidden="true" />}
          />
        </section>

        <section className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            Model Reasoning
          </h3>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant space-y-2 text-xs">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Clinical reasoning</span>
            <p className="text-on-surface/90 leading-relaxed whitespace-pre-wrap">{result.clinical_reasoning || NOT_PROVIDED}</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant space-y-2 text-xs">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Uncertainty &amp; limitations
            </span>
            <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{result.uncertainty_notes || NOT_PROVIDED}</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            Investigations to Consider
          </h3>
          <ItemList items={result.recommended_investigations} empty="The model did not suggest investigations." numbered />
        </section>
        <section className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Missing Clinical Information
          </h3>
          <ItemList items={result.missing_information} empty="The model did not list missing information." />
        </section>
      </div>
    </div>
  );
}

export function AlertPanel({ result }: { result: ClinicalResult }) {
  const alert = result.alert;
  const severity: Severity | null = alert?.severity ?? null;
  const items = alert && alert.items.length > 0 ? alert.items : result.red_flags;

  if (!severity) {
    return (
      <div className="w-full rounded-xl border border-outline-variant bg-surface-container p-4 text-xs text-on-surface-variant" role="status">
        The model did not provide an urgency assessment for this case.
      </div>
    );
  }

  const tone = {
    critical: { box: 'bg-[#241315] border-error/30', head: 'bg-[#3b1111] border-error/20 text-error', item: 'bg-error-container/20 border-error/20 text-on-error-container', dot: 'bg-error' },
    moderate: { box: 'bg-amber-950/20 border-amber-500/30', head: 'bg-amber-500/10 border-amber-500/20 text-amber-400', item: 'bg-amber-500/10 border-amber-500/20 text-amber-200', dot: 'bg-amber-400' },
    low: { box: 'bg-tertiary-container/10 border-tertiary/30', head: 'bg-tertiary-container/20 border-tertiary/20 text-tertiary', item: 'bg-tertiary/10 border-tertiary/20 text-tertiary', dot: 'bg-tertiary' },
  }[severity];

  return (
    <section aria-label="Urgency assessment" className={`w-full rounded-xl overflow-hidden border ${tone.box}`}>
      <div className={`p-3.5 border-b flex items-center justify-between gap-3 ${tone.head}`}>
        <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider">
          {severity === 'low' ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          <span>{alert?.title || SEVERITY_TITLE[severity]}</span>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border border-current">Severity: {severity}</span>
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {alert?.summary && <p className="text-xs text-on-surface-variant">{alert.summary}</p>}
        {items.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <li key={idx} className={`flex gap-2.5 items-start p-3 rounded border text-xs font-medium ${tone.item}`}>
                <span className={`w-2 h-2 rounded-full block mt-1 shrink-0 ${tone.dot}`} aria-hidden="true" />
                <p className="leading-snug">{item}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-on-surface-variant">
            The model listed no specific red flags. This is not confirmation that none exist.
          </p>
        )}
      </div>
    </section>
  );
}

export function Differentials({ items }: { items: ClinicalResult['differential_diagnoses'] }) {
  return (
    <section className="space-y-4 w-full" aria-label="Differential considerations">
      <h3 className="text-base font-bold text-on-surface tracking-tight flex items-center gap-2">
        <ListOrdered className="h-5 w-5 text-primary" aria-hidden="true" />
        Differential Considerations &amp; Qualitative Likelihood
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-on-surface-variant">The model returned no differential considerations.</p>
      ) : (
        <ul className="flex flex-wrap justify-center gap-6 w-full">
          {items.map((d, idx) => (
            <li
              key={idx}
              className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1.125rem)] bg-surface-container border border-outline-variant rounded-xl p-5 relative overflow-hidden"
            >
              <span
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${d.likelihood === 'high' ? 'bg-primary' : d.likelihood === 'moderate' ? 'bg-tertiary' : 'bg-outline'}`}
                aria-hidden="true"
              />
              <div className="space-y-4 pl-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-base font-bold text-on-surface leading-snug">{d.diagnosis}</h4>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-outline-variant shrink-0">
                    Likelihood: {d.likelihood}
                  </span>
                </div>
                <Evidence label="Supporting factors" items={d.supporting_evidence} positive />
                <Evidence label="Contradicting factors" items={d.contradicting_evidence} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Evidence({ label, items, positive }: { label: string; items: string[]; positive?: boolean }) {
  if (items.length === 0) return null;
  const Icon = positive ? PlusCircle : MinusCircle;
  return (
    <div className="space-y-2 pt-1">
      <span className={`text-[11px] font-bold uppercase tracking-wider block ${positive ? 'text-tertiary' : 'text-on-surface-variant'}`}>{label}</span>
      <ul className="space-y-1.5 text-xs">
        {items.map((item, i) => (
          <li key={i} className={`flex items-start gap-2 ${positive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${positive ? 'text-tertiary' : 'text-secondary'}`} aria-hidden="true" />
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemList({ label, items, empty, numbered, icon }: { label?: string; items: string[]; empty: string; numbered?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">{label}</span>}
      {items.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <li key={idx} className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex items-start gap-3 text-xs text-on-surface">
              {numbered ? (
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0" aria-hidden="true">
                  {idx + 1}
                </span>
              ) : (
                icon ?? <span className="text-amber-400 font-bold shrink-0" aria-hidden="true">•</span>
              )}
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
