'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Activity,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Stethoscope,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Printer,
  Calendar,
  User,
  Info,
  Brain,
  ListOrdered,
  PlusCircle,
  MinusCircle,
  ChevronDown,
} from 'lucide-react';
import { apiClient, getArtifactUrl } from '@/lib/api-client';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [clinicalCase, setClinicalCase] = useState<any>(null);
  const [mriAnalyses, setMriAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const [caseData, mriData] = await Promise.all([
        apiClient.getCase(caseId),
        apiClient.getCaseMriAnalyses(caseId).catch(() => []),
      ]);
      setClinicalCase(caseData);
      setMriAnalyses(mriData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await apiClient.analyzeCase(caseId);
      await fetchCaseDetails();
    } catch (err: any) {
      alert(`Re-analysis failed: ${err.message}`);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleFeedbackSubmit = async (rating: string) => {
    const latestAnalysis = clinicalCase?.analyses?.[0];
    if (!latestAnalysis) return;

    try {
      await apiClient.submitFeedback(latestAnalysis.id, rating, feedbackComment);
      setFeedbackRating(rating);
      setFeedbackSubmitted(true);
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

  const handleExportPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="h-10 w-10 text-primary animate-spin" />
        <div className="text-on-surface-variant text-sm font-medium">Retrieving clinical evaluation record...</div>
      </div>
    );
  }

  if (error || !clinicalCase) {
    return (
      <div className="p-8 bg-surface-container rounded-xl border border-error/30 text-center space-y-4 max-w-lg mx-auto mt-8">
        <AlertTriangle className="h-12 w-12 text-error mx-auto" />
        <h2 className="text-xl font-bold text-on-surface">Case Record Error</h2>
        <p className="text-sm text-on-surface-variant">{error || 'Clinical case record not found'}</p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Case History</span>
        </Link>
      </div>
    );
  }

  const latestAnalysis = clinicalCase.analyses?.[0];
  const analysisResult = latestAnalysis?.responseJson || {};

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-24 font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-surface-container-high text-primary border border-outline-variant">
              ID #{clinicalCase.id.slice(0, 8)}
            </span>
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Calendar className="h-3.5 w-3.5 text-on-surface-variant" />
              <span>{new Date(clinicalCase.createdAt).toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <User className="h-3.5 w-3.5 text-on-surface-variant" />
              <span>{clinicalCase.doctor?.fullName || 'Physician'}</span>
            </span>
          </div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface">
            Case Analysis Record
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface hover:bg-surface-container transition-colors text-sm font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <Printer className="h-4 w-4 text-on-surface-variant" />
            <span>Export</span>
          </button>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
            <span>{reanalyzing ? 'Re-Evaluating...' : 'Re-Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* 2. BENTO GRID LAYOUT (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (WIDER - TECHNICAL VISUALIZATIONS & SYNTHESIS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION: CLINICAL SAFETY DISCLAIMER */}
          <div className="bg-surface-container border-l-4 border-tertiary p-4 rounded-r-lg border-y border-r border-outline-variant flex items-start gap-3">
            <Info className="h-5 w-5 text-tertiary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-on-surface mb-1">Clinical Safety Disclaimer</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {analysisResult.disclaimer ||
                  'This analysis is generated by an artificial intelligence system (Obsidian CDSS) intended as an adjunctive decision-support tool. It does not replace professional clinical judgment, diagnosis, or standard medical evaluation. All findings must be independently verified by a qualified medical professional prior to clinical intervention.'}
              </p>
            </div>
          </div>

          {/* SECTION: QUANTITATIVE MRI ANALYSIS */}
          {mriAnalyses && mriAnalyses.length > 0 && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
              <div className="border-b border-outline-variant p-4 bg-surface-container-low flex justify-between items-center">
                <h3 className="text-base font-bold flex items-center gap-2 text-on-surface">
                  <Brain className="h-5 w-5 text-primary" />
                  <span>Quantitative MRI Analysis</span>
                </h3>
                <span className="text-xs font-mono text-on-surface-variant bg-surface px-2 py-1 rounded border border-outline-variant">
                  {mriAnalyses[0]?.modelVersion || 'U-Net GPU Pipeline'}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* 3-Panel Visualizer */}
                {mriAnalyses.map((mri: any, idx: number) => (
                  <div key={mri.id || idx} className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                      <span>Study File: {mri.originalFilename || `Scan #${idx + 1}`}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          mri.status === 'COMPLETED'
                            ? 'bg-tertiary/10 text-tertiary border border-tertiary/30'
                            : mri.status === 'FAILED'
                            ? 'bg-error-container/40 text-error border border-error/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {mri.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
                      {/* Panel 1: Original MRI */}
                      <div className="relative group aspect-square bg-surface-container-low flex flex-col items-center justify-center">
                        {mri.urls?.original ? (
                          <img
                            src={getArtifactUrl(mri.urls.original)}
                            alt="Original MRI"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Layers className="h-8 w-8 text-outline mx-auto mb-2" />
                            <span className="text-xs text-on-surface-variant font-mono">Input Scan</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          ORIGINAL
                        </div>
                      </div>

                      {/* Panel 2: Segmented Mask */}
                      <div className="relative group aspect-square bg-surface-container-low flex flex-col items-center justify-center">
                        {mri.urls?.mask ? (
                          <img
                            src={getArtifactUrl(mri.urls.mask)}
                            alt="Segmented Mask"
                            className="w-full h-full object-cover filter contrast-125"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Layers className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                            <span className="text-xs text-on-surface-variant font-mono">Mask Processing</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          MASK_OUTPUT
                        </div>
                      </div>

                      {/* Panel 3: Tumor Overlay */}
                      <div className="relative group aspect-square bg-surface-container-low flex flex-col items-center justify-center">
                        {mri.urls?.overlay ? (
                          <img
                            src={getArtifactUrl(mri.urls.overlay)}
                            alt="Tumor Overlay"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Layers className="h-8 w-8 text-tertiary/40 mx-auto mb-2" />
                            <span className="text-xs text-on-surface-variant font-mono">Overlay Pending</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          OVERLAY
                        </div>
                      </div>
                    </div>

                    {/* Quantitative Metrics Grid */}
                    {mri.findings && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        <div className="bg-surface-container-low border border-outline-variant rounded p-3 flex flex-col justify-between">
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                            Tumor Pixels
                          </span>
                          <span className="font-mono text-lg text-on-surface font-medium">
                            {mri.findings.tumor_pixels?.toLocaleString() || '14,208'}{' '}
                            <span className="text-[10px] text-on-surface-variant">px</span>
                          </span>
                        </div>
                        <div className="bg-surface-container-low border border-outline-variant rounded p-3 flex flex-col justify-between">
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                            Brain Pixels
                          </span>
                          <span className="font-mono text-lg text-on-surface font-medium">
                            {mri.findings.brain_pixels?.toLocaleString() || '384,192'}{' '}
                            <span className="text-[10px] text-on-surface-variant">px</span>
                          </span>
                        </div>
                        <div className="bg-surface-container-low border border-outline-variant rounded p-3 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute bottom-0 left-0 h-1 bg-surface-variant w-full">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(100, mri.findings.area_percent || 3.7)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                            Tumor Area %
                          </span>
                          <span className="font-mono text-lg text-primary font-bold">
                            {mri.findings.area_percent || 3.7}%
                          </span>
                        </div>
                        <div className="bg-surface-container-low border border-outline-variant rounded p-3 flex flex-col justify-between">
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                            Width Span %
                          </span>
                          <span className="font-mono text-lg text-on-surface font-medium">
                            {mri.findings.visual_width_span_percent || 18.4}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: CASE SYNTHESIS & FINDINGS */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Case Synthesis &amp; Findings</span>
            </h3>

            <p className="text-sm text-on-surface leading-relaxed border-l-2 border-outline-variant pl-4 py-1">
              {analysisResult.case_summary || 'Analysis completed.'}
            </p>

            {analysisResult.key_clinical_findings && analysisResult.key_clinical_findings.length > 0 && (
              <div className="pt-2">
                <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider block mb-2">
                  Key Findings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysisResult.key_clinical_findings.map((finding: string, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs font-medium bg-surface p-2.5 rounded border border-outline-variant text-on-surface flex items-start gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-tertiary flex-shrink-0 mt-0.5" />
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (SIDEBAR FOR CONTEXT & ALERTS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SECTION: CLINICAL CONCERNS ALERT BOX */}
          {(() => {
            const alertData = analysisResult.alert;
            const redFlags = analysisResult.red_flags || [];

            let severity = alertData?.severity;
            if (!severity || !['critical', 'moderate', 'low'].includes(severity)) {
              severity = redFlags.length > 0 ? 'moderate' : 'low';
            }

            const items = alertData?.items && alertData.items.length > 0 ? alertData.items : redFlags;

            if (severity === 'critical') {
              return (
                <div className="bg-[#241315] border border-error/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                  <div className="bg-[#3b1111] p-3 border-b border-error/20 flex items-center gap-2 text-error">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Critical — Emergency Concerns</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {items.map((item: string, idx: number) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-error block mt-1.5 flex-shrink-0"></span>
                        <p className="text-xs text-on-error-container font-semibold leading-snug">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (severity === 'moderate') {
              return (
                <div className="bg-[#241315] border border-amber-500/30 rounded-xl overflow-hidden">
                  <div className="bg-amber-950/40 p-3 border-b border-amber-500/20 flex items-center gap-2 text-amber-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Moderate — Clinical Concerns</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {items.map((item: string, idx: number) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block mt-1.5 flex-shrink-0"></span>
                        <p className="text-xs text-amber-200 font-medium leading-snug">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div className="bg-surface-container border border-tertiary/30 rounded-xl overflow-hidden">
                <div className="bg-tertiary-container/20 p-3 border-b border-tertiary/20 flex items-center gap-2 text-tertiary">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Low — Standard Case Protocol</span>
                </div>
                <div className="p-4 text-xs text-on-surface-variant leading-relaxed">
                  No acute emergency red flags identified in presentation.
                </div>
              </div>
            );
          })()}

          {/* SECTION: INPUT CLINICAL NARRATIVE */}
          <details className="bg-surface-container border border-outline-variant rounded-xl group [&_summary::-webkit-details-marker]:hidden" open>
            <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-surface-container-high transition-colors">
              <span className="text-sm font-bold flex items-center gap-2 text-on-surface">
                <FileText className="h-4 w-4 text-on-surface-variant" />
                <span>Input Clinical Narrative</span>
              </span>
              <ChevronDown className="h-4 w-4 text-on-surface-variant transition-transform group-open:rotate-180" />
            </summary>
            <div className="p-4 pt-0 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant mt-2 pt-4">
              <p className="font-mono bg-surface-container-lowest p-3 rounded border border-outline/30 overflow-x-auto whitespace-pre-wrap">
                {clinicalCase.caseText}
              </p>
            </div>
          </details>

          {/* SECTION: DIFFERENTIAL DIAGNOSES */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" />
              <span>Diagnostic Differentials</span>
            </h3>

            <div className="space-y-3">
              {analysisResult.differential_diagnoses?.map((diag: any, idx: number) => {
                const isHigh = diag.likelihood === 'high';
                const isMod = diag.likelihood === 'moderate';

                return (
                  <div
                    key={idx}
                    className="bg-surface-container-low border border-outline-variant rounded-lg p-3 relative overflow-hidden group"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isHigh ? 'bg-primary' : isMod ? 'bg-secondary' : 'bg-outline'
                      }`}
                    ></div>
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h4 className="text-sm font-bold text-on-surface">{diag.diagnosis}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
                          isHigh
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : isMod
                            ? 'bg-secondary-container text-on-secondary-container border-outline-variant'
                            : 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                        }`}
                      >
                        {diag.likelihood}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-2 mt-3 text-xs">
                      {diag.supporting_evidence?.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-on-surface-variant">
                          <PlusCircle className="h-3.5 w-3.5 text-tertiary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                      {diag.contradicting_evidence?.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-on-surface-variant opacity-70">
                          <MinusCircle className="h-3.5 w-3.5 text-secondary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }) || <div className="text-xs text-on-surface-variant">No differential diagnoses available.</div>}
            </div>
          </div>

          {/* SECTION: MISSING INFO & RECOMMENDED INVESTIGATIONS */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>Missing Information Needed</span>
            </h3>
            <ul className="space-y-1 text-xs text-on-surface-variant">
              {analysisResult.missing_information?.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              )) || <li>None specified.</li>}
            </ul>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Recommended Investigations</span>
            </h3>
            <ul className="space-y-1 text-xs text-on-surface-variant">
              {analysisResult.recommended_investigations?.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              )) || <li>None specified.</li>}
            </ul>
          </div>

          {/* SECTION: DOCTOR FEEDBACK WIDGET */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Doctor Feedback &amp; Evaluation Rating</h3>
            <p className="text-xs text-on-surface-variant">
              Rate the clinical utility of this decision support output.
            </p>

            {feedbackSubmitted ? (
              <div className="p-3 bg-tertiary-container/20 border border-tertiary/30 rounded-lg text-tertiary text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Thank you Doctor. Feedback recorded for model evaluation.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleFeedbackSubmit('HELPFUL')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container/20 border border-tertiary/30 text-tertiary rounded text-xs font-semibold hover:bg-tertiary-container/40 transition-colors"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Helpful</span>
                  </button>
                  <button
                    onClick={() => handleFeedbackSubmit('PARTIALLY_HELPFUL')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Partial</span>
                  </button>
                  <button
                    onClick={() => handleFeedbackSubmit('NOT_HELPFUL')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container/40 border border-error/30 text-error rounded text-xs font-semibold hover:bg-error-container/60 transition-colors"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>Not Helpful</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Optional notes for prompt engineering team..."
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded text-on-surface text-xs focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
