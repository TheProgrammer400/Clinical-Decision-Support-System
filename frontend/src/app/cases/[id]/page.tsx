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
  Image as ImageIcon,
  Cpu,
  Layers,
  Sparkles,
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="h-10 w-10 text-sky-400 animate-spin" />
        <div className="text-slate-400 text-sm font-medium">Retrieving clinical evaluation record...</div>
      </div>
    );
  }

  if (error || !clinicalCase) {
    return (
      <div className="p-8 glass-panel rounded-2xl border border-red-500/30 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Case Record Error</h2>
        <p className="text-sm text-slate-400">{error || 'Clinical case record not found'}</p>
        <Link
          href="/cases"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to History</span>
        </Link>
      </div>
    );
  }

  const latestAnalysis = clinicalCase.analyses?.[0];
  const analysisResult = latestAnalysis?.responseJson || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Disclaimer Banner */}
      <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-start space-x-3 text-sky-200 text-xs sm:text-sm">
        <ShieldCheck className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-sky-300">CLINICAL SAFETY DISCLAIMER: </span>
          {analysisResult.disclaimer ||
            'AI-GENERATED CLINICAL DECISION SUPPORT — NOT A DEFINITIVE DIAGNOSIS. THIS SYSTEM SUPPORTS BUT DOES NOT REPLACE INDEPENDENT CLINICAL JUDGMENT BY A LICENSED HEALTHCARE PROFESSIONAL.'}
        </div>
      </div>

      {/* Case Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/cases"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <Stethoscope className="h-6 w-6 text-sky-400" />
              <span>Case Analysis Record</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                #{clinicalCase.id.slice(0, 8)}
              </span>
            </h1>
            <div className="text-xs text-slate-400 flex items-center space-x-3 mt-1">
              <span className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(clinicalCase.createdAt).toLocaleString()}</span>
              </span>
              <span>•</span>
              <span>Author: {clinicalCase.doctor?.fullName || 'Physician'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-sm font-medium rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
          <span>{reanalyzing ? 'Re-Evaluating...' : 'Re-Run Analysis'}</span>
        </button>
      </div>

      {/* Input Narrative Collapsible Section */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <FileText className="h-4 w-4 text-sky-400" />
          <span>Original Clinical Case Presentation Input</span>
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-xs">
          {clinicalCase.caseText}
        </p>
      </div>

      {/* BRAIN MRI SEGMENTATION & VISUALIZATIONS SECTION */}
      {mriAnalyses && mriAnalyses.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-6 bg-purple-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Cpu className="h-6 w-6 text-purple-400" />
                <span>Brain MRI Quantitative Segmentation & Visualizations</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  U-Net GPU
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automated PyTorch ResNet50-UNet image-derived quantitative findings & 3-panel visualization artifacts.
              </p>
            </div>
            <div className="text-xs text-purple-300 font-mono bg-purple-900/40 px-3 py-1.5 rounded-xl border border-purple-500/30 self-start">
              Model Version: {mriAnalyses[0]?.modelVersion || 'unet_v1.2.0'}
            </div>
          </div>

          {/* MRI Imaging Non-Diagnostic Banner */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200 italic flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span>
              Automated image segmentation output — NOT a diagnosis, NOT a determination of tumor type, and NOT a grading assessment. Reviewed findings must be clinically correlated.
            </span>
          </div>

          {/* Iterate over MRI Analysis Records */}
          <div className="space-y-8">
            {mriAnalyses.map((mri: any, idx: number) => (
              <div
                key={mri.id}
                className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-slate-200">
                      Scan #{idx + 1}: {mri.originalFilename}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">({mri.id.slice(0, 8)})</span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase ${
                      mri.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : mri.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {mri.status}
                  </span>
                </div>

                {mri.status === 'FAILED' ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                    <span className="font-semibold">Segmentation Failed: </span>
                    {mri.errorMessage || 'Image processing error'}
                  </div>
                ) : (
                  <>
                    {/* 3-Panel Visualization Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* 1. Original MRI */}
                      <div className="space-y-2 text-center">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1">
                          <Layers className="h-3.5 w-3.5 text-sky-400" />
                          <span>1. Input Brain MRI</span>
                        </div>
                        <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                          {mri.urls?.original ? (
                            <img
                              src={getArtifactUrl(mri.urls.original)}
                              alt="Original MRI"
                              className="w-full h-full object-contain hover:scale-105 transition-transform"
                            />
                          ) : (
                            <span className="text-xs text-slate-600">No preview</span>
                          )}
                        </div>
                      </div>

                      {/* 2. Segmented Mask */}
                      <div className="space-y-2 text-center">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1">
                          <Layers className="h-3.5 w-3.5 text-purple-400" />
                          <span>2. Segmented Mask</span>
                        </div>
                        <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                          {mri.urls?.mask ? (
                            <img
                              src={getArtifactUrl(mri.urls.mask)}
                              alt="Segmented Mask"
                              className="w-full h-full object-contain hover:scale-105 transition-transform"
                            />
                          ) : (
                            <span className="text-xs text-slate-600">Mask pending</span>
                          )}
                        </div>
                      </div>

                      {/* 3. Tumor Overlay */}
                      <div className="space-y-2 text-center">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1">
                          <Layers className="h-3.5 w-3.5 text-red-400" />
                          <span>3. Tumor Overlay</span>
                        </div>
                        <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                          {mri.urls?.overlay ? (
                            <img
                              src={getArtifactUrl(mri.urls.overlay)}
                              alt="Tumor Overlay"
                              className="w-full h-full object-contain hover:scale-105 transition-transform"
                            />
                          ) : (
                            <span className="text-xs text-slate-600">Overlay pending</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantitative Findings Stats Table */}
                    {mri.findings && (
                      <div className="pt-3 border-t border-slate-800">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Quantitative Segmentation Metrics
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div className="text-slate-500 text-[10px] uppercase">Tumor Pixels</div>
                            <div className="text-sm font-bold text-red-400 mt-0.5">
                              {mri.findings.tumor_pixels} px
                            </div>
                          </div>
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div className="text-slate-500 text-[10px] uppercase">Brain Pixels</div>
                            <div className="text-sm font-bold text-sky-400 mt-0.5">
                              {mri.findings.brain_pixels} px
                            </div>
                          </div>
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div className="text-slate-500 text-[10px] uppercase">Tumor Area %</div>
                            <div className="text-sm font-bold text-purple-400 mt-0.5">
                              {mri.findings.area_percent}%
                            </div>
                          </div>
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div className="text-slate-500 text-[10px] uppercase">Width Span %</div>
                            <div className="text-sm font-bold text-amber-400 mt-0.5">
                              ~{mri.findings.visual_width_span_percent}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLINICAL ALERT SECTION (CONDITIONAL SEVERITY: CRITICAL, MODERATE, LOW) */}
      {(() => {
        const alertData = analysisResult.alert;
        const redFlags = analysisResult.red_flags || [];

        let severity = alertData?.severity;
        if (!severity || !['critical', 'moderate', 'low'].includes(severity)) {
          severity = redFlags.length > 0 ? 'moderate' : 'low';
        }

        const items = alertData?.items && alertData.items.length > 0 ? alertData.items : redFlags;
        const title =
          alertData?.title ||
          (severity === 'critical'
            ? 'CRITICAL — URGENT EMERGENCY RULE-OUTS'
            : severity === 'moderate'
            ? 'MODERATE — CLINICAL CONCERNS TO MONITOR'
            : 'LOW — NO IMMEDIATE RED FLAGS IDENTIFIED');
        const summary = alertData?.summary;

        if (severity === 'critical') {
          return (
            <div className="p-5 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-3 shadow-lg shadow-red-950/50">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-base">
                <AlertTriangle className="h-6 w-6 text-red-400 animate-pulse" />
                <span>{title}</span>
              </div>
              {summary && <p className="text-xs text-red-300/90 italic">{summary}</p>}
              <ul className="space-y-2 pl-2">
                {items.map((flag: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2 text-sm text-red-200">
                    <span className="text-red-500 font-bold">•</span>
                    <span className="font-semibold">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (severity === 'moderate') {
          return (
            <div className="p-5 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3 shadow-lg shadow-amber-950/50">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-base">
                <AlertCircle className="h-6 w-6 text-amber-400" />
                <span>{title}</span>
              </div>
              {summary && <p className="text-xs text-amber-300/90 italic">{summary}</p>}
              <ul className="space-y-2 pl-2">
                {items.length > 0 ? (
                  items.map((flag: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-amber-200">
                      <span className="text-amber-400 font-bold">•</span>
                      <span className="font-medium">{flag}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-amber-200">Clinically important concerns identified that warrant timely evaluation.</li>
                )}
              </ul>
            </div>
          );
        }

        // LOW / GREEN
        return (
          <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <span>{title}</span>
            </div>
            {summary && <p className="text-xs text-emerald-300/90 italic">{summary}</p>}
            <ul className="space-y-2 pl-2">
              {items.length > 0 ? (
                items.map((flag: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2 text-sm text-emerald-200">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{flag}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-emerald-200">No immediate emergency features identified from the information provided.</li>
              )}
            </ul>
          </div>
        );
      })()}

      {/* Case Summary & Key Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <span>Case Synthesis Summary</span>
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {analysisResult.case_summary || 'No summary available.'}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Key Clinical Findings</span>
          </h3>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {analysisResult.key_clinical_findings?.map((finding: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{finding}</span>
              </li>
            )) || <li className="text-slate-500 text-xs">No key findings listed.</li>}
          </ul>
        </div>
      </div>

      {/* DIFFERENTIAL DIAGNOSES CARDS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
          <Stethoscope className="h-5 w-5 text-sky-400" />
          <span>Differential Diagnostic Considerations (Qualitative Likelihood)</span>
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {analysisResult.differential_diagnoses?.map((diag: any, idx: number) => (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">{diag.diagnosis}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    diag.likelihood === 'high'
                      ? 'badge-likelihood-high'
                      : diag.likelihood === 'moderate'
                      ? 'badge-likelihood-moderate'
                      : 'badge-likelihood-low'
                  }`}
                >
                  {diag.likelihood} Likelihood
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                  <div className="font-semibold text-emerald-400 mb-1">Supporting Evidence:</div>
                  <ul className="space-y-1 text-slate-300">
                    {diag.supporting_evidence?.map((item: string, i: number) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-emerald-400">+</span>
                        <span>{item}</span>
                      </li>
                    )) || <li>None specified</li>}
                  </ul>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                  <div className="font-semibold text-amber-400 mb-1">Contradicting / Missing Factors:</div>
                  <ul className="space-y-1 text-slate-300">
                    {diag.contradicting_evidence?.map((item: string, i: number) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-400">-</span>
                        <span>{item}</span>
                      </li>
                    )) || <li>None specified</li>}
                  </ul>
                </div>
              </div>
            </div>
          )) || <div className="text-slate-400 text-sm">No differential diagnoses generated.</div>}
        </div>
      </div>

      {/* MISSING INFORMATION & RECOMMENDED INVESTIGATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <HelpCircle className="h-4 w-4 text-amber-400" />
            <span>Missing Clinical Information Needed</span>
          </h3>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {analysisResult.missing_information?.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            )) || <li className="text-slate-500 text-xs">No missing info specified.</li>}
          </ul>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center space-x-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <span>Recommended Diagnostic Investigations</span>
          </h3>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {analysisResult.recommended_investigations?.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-sky-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            )) || <li className="text-slate-500 text-xs">No recommended investigations listed.</li>}
          </ul>
        </div>
      </div>

      {/* CLINICAL REASONING & UNCERTAINTY NOTES */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Synthesized Clinical Reasoning
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {analysisResult.clinical_reasoning || 'No clinical reasoning provided.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Evaluation Confidence & Uncertainty Notes
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed italic">
            {analysisResult.uncertainty_notes || 'No explicit uncertainty notes.'}
          </p>
        </div>
      </div>

      {/* DOCTOR FEEDBACK WIDGET */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Doctor Feedback & Evaluation Rating</h3>
        <p className="text-xs text-slate-400">
          Rate the clinical utility of this decision support output to help improve prompt engineering performance.
        </p>

        {feedbackSubmitted ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Thank you Doctor. Feedback recorded for prompt version {latestAnalysis.promptVersion}.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleFeedbackSubmit('HELPFUL')}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <ThumbsUp className="h-4 w-4" />
                <span>Helpful</span>
              </button>
              <button
                onClick={() => handleFeedbackSubmit('PARTIALLY_HELPFUL')}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Partially Helpful</span>
              </button>
              <button
                onClick={() => handleFeedbackSubmit('NOT_HELPFUL')}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <ThumbsDown className="h-4 w-4" />
                <span>Not Helpful</span>
              </button>
            </div>
            <div>
              <input
                type="text"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Optional feedback notes for the engineering team..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
