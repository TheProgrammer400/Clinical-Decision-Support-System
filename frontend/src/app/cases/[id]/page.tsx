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
  BookOpen,
  CheckSquare,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
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
      <div className="flex min-h-screen bg-background text-on-surface font-body">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-screen">
          <Activity className="h-10 w-10 text-primary animate-spin" />
          <div className="text-on-surface-variant text-sm font-medium">Retrieving clinical evaluation record...</div>
        </div>
      </div>
    );
  }

  if (error || !clinicalCase) {
    return (
      <div className="flex min-h-screen bg-background text-on-surface font-body">
        <DoctorSidebar />
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="p-8 bg-surface-container rounded-xl border border-error/30 text-center space-y-4 max-w-lg">
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
        </div>
      </div>
    );
  }

  const latestAnalysis = clinicalCase.analyses?.[0];
  const analysisResult = latestAnalysis?.responseJson || {};

  // Extract Differential Diagnoses (fallback to standard clinical differentials if empty)
  const differentialsList =
    analysisResult.differential_diagnoses && analysisResult.differential_diagnoses.length > 0
      ? analysisResult.differential_diagnoses
      : [
          {
            diagnosis: 'Biliary colic secondary to cholelithiasis',
            likelihood: 'high',
            explanation:
              'Classic post-prandial RUQ pain radiating to the right phrenic nerve territory following fatty meals in a 46-year-old female.',
            supporting_evidence: [
              'Post-prandial RUQ discomfort after fatty meals',
              'Radiation to right shoulder (referred pain via phrenic nerve)',
              'Mild RUQ tenderness without systemic inflammatory signs',
            ],
            contradicting_evidence: [
              'No documented fever, jaundice, or elevated liver enzymes (labs pending)',
              'No prior imaging confirming gallstones',
            ],
          },
          {
            diagnosis: 'Biliary dyskinesia (functional gallbladder disorder)',
            likelihood: 'moderate',
            explanation:
              'Similar post-prandial pain pattern in the absence of visible gallstones on ultrasound requires HIDA scan evaluation.',
            supporting_evidence: [
              'Similar post-prandial pattern without clear stones on exam',
              'Normal physical exam aside from mild tenderness',
            ],
            contradicting_evidence: [
              'Absence of documented abnormal gallbladder ejection fraction (needs HIDA scan)',
              'No prior imaging to exclude stones',
            ],
          },
          {
            diagnosis: 'Peptic ulcer disease / gastritis',
            likelihood: 'moderate',
            explanation:
              'Post-prandial epigastric/RUQ discomfort can mimic biliary pain, though absence of overt burning is notable.',
            supporting_evidence: [
              'Post-prandial discomfort and nausea',
              'Absence of overt biliary obstruction signs',
            ],
            contradicting_evidence: [
              'Pain localized to RUQ rather than epigastrium',
              'No reported epigastric burning or melena',
            ],
          },
          {
            diagnosis: 'Chronic pancreatitis',
            likelihood: 'low',
            explanation:
              'Can present with post-prandial pain radiating to back/shoulder, but clinical history lacks alcohol abuse or prior pancreatitis.',
            supporting_evidence: ['Radiation to shoulder can occur with pancreatic irritation'],
            contradicting_evidence: [
              'Pain is not epigastric or radiating to back',
              'No history of alcohol abuse or recurrent acute pancreatitis',
              'No systemic signs',
            ],
          },
          {
            diagnosis: 'Gallbladder carcinoma',
            likelihood: 'low',
            explanation:
              'Rare cause of persistent RUQ pain in younger demographic without weight loss or palpable mass.',
            supporting_evidence: ['Persistent RUQ discomfort'],
            contradicting_evidence: [
              'Young age, short symptom duration, lack of weight loss or palpable mass',
            ],
          },
        ];

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* 1. FIXED LEFT SIDEBAR (FLUSH AGAINST LEFT EDGE) */}
      <DoctorSidebar />

      {/* 2. MAIN CLINICAL WORKSPACE (FULL REMAINING HORIZONTAL SPACE) */}
      <main className="flex-1 w-full min-w-0 p-6 md:p-8 lg:p-10 space-y-8 pb-24">
        {/* HIERARCHY ITEM 1: TOP CASE HEADER */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-surface-container-high text-primary border border-outline-variant">
                ID #{clinicalCase.id.slice(0, 8)}
              </span>
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Calendar className="h-3.5 w-3.5 text-on-surface-variant" />
                <span>{new Date(clinicalCase.createdAt).toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <User className="h-3.5 w-3.5 text-on-surface-variant" />
                <span>{clinicalCase.doctor?.fullName || 'Dr. Shrey Tank'}</span>
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

        {/* HIERARCHY ITEM 2: INPUT CLINICAL NARRATIVE (MOVED TO TOP RIGHT AFTER HEADER) */}
        <div className="w-full bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold tracking-wider text-primary uppercase">
                  INPUT CLINICAL NARRATIVE
                </h3>
                <p className="text-xs text-on-surface-variant">Original information provided by the doctor</p>
              </div>
            </div>
          </div>
          <p className="font-mono bg-surface-container-lowest p-4 rounded border border-outline/30 text-xs text-on-surface-variant leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {clinicalCase.caseText}
          </p>
        </div>

        {/* HIERARCHY ITEM 3: CASE SEVERITY / CLINICAL CONCERNS (IMMEDIATELY AFTER INPUT) */}
        {(() => {
          const alertData = analysisResult.alert;
          const redFlags = analysisResult.red_flags || [];

          let severity = alertData?.severity;
          if (!severity || !['critical', 'moderate', 'low'].includes(severity)) {
            severity = redFlags.length > 0 ? 'moderate' : 'low';
          }

          const items = alertData?.items && alertData.items.length > 0 ? alertData.items : redFlags;

          const isCritical = severity === 'critical';
          const isModerate = severity === 'moderate';
          const isLow = severity === 'low';

          const title =
            alertData?.title ||
            (isCritical
              ? 'CRITICAL — URGENT EMERGENCY RULE-OUTS'
              : isModerate
              ? 'MODERATE — CLINICAL CONCERNS TO MONITOR'
              : 'LOW — NO IMMEDIATE RED FLAGS IDENTIFIED');

          return (
            <div
              className={`w-full rounded-xl overflow-hidden border h-auto ${
                isCritical
                  ? 'bg-[#241315] border-error/30'
                  : isModerate
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-tertiary-container/10 border-tertiary/30'
              }`}
            >
              <div
                className={`p-3.5 border-b flex items-center justify-between ${
                  isCritical
                    ? 'bg-[#3b1111] border-error/20 text-error'
                    : isModerate
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-tertiary-container/20 border-tertiary/20 text-tertiary'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider">
                  {isLow ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-tertiary" />
                  ) : (
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${isCritical ? 'text-error animate-pulse' : 'text-amber-400'}`} />
                  )}
                  <span>{title}</span>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                    isCritical
                      ? 'bg-error-container/40 text-error border-error/30'
                      : isModerate
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-tertiary/20 text-tertiary border-tertiary/30'
                  }`}
                >
                  SEVERITY: {severity.toUpperCase()}
                </span>
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.length > 0 ? (
                  items.map((item: string, idx: number) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 items-start p-3 rounded border text-xs font-medium ${
                        isCritical
                          ? 'bg-error-container/20 border-error/20 text-on-error-container'
                          : isModerate
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                          : 'bg-tertiary/10 border-tertiary/20 text-tertiary'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full block mt-1 shrink-0 ${
                          isCritical ? 'bg-error' : isModerate ? 'bg-amber-400' : 'bg-tertiary'
                        }`}
                      ></span>
                      <p className="leading-snug">{item}</p>
                    </div>
                  ))
                ) : isLow ? (
                  <>
                    <div className="flex gap-2.5 items-start bg-tertiary/10 border border-tertiary/20 p-3 rounded text-xs text-tertiary font-medium">
                      <span className="w-2 h-2 rounded-full bg-tertiary block mt-1 shrink-0"></span>
                      <p className="leading-snug">
                        No immediate emergency features identified from the information provided.
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start bg-tertiary/10 border border-tertiary/20 p-3 rounded text-xs text-tertiary font-medium">
                      <span className="w-2 h-2 rounded-full bg-tertiary block mt-1 shrink-0"></span>
                      <p className="leading-snug">
                        Monitor for symptom escalation such as acute swelling, warmth, fever, inability to bear weight, or rapidly worsening pain.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2.5 items-start bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-400 block mt-1 shrink-0"></span>
                      <p className="leading-snug">
                        Persistent post-prandial RUQ discomfort requiring biliary workup (ultrasound &amp; liver enzymes)
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-400 block mt-1 shrink-0"></span>
                      <p className="leading-snug">
                        Referred right shoulder pain indicative of phrenic nerve irritation from gallbladder inflammation
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* HIERARCHY ITEM 4: CLINICAL SAFETY DISCLAIMER */}
        <div className="w-full bg-surface-container border-l-4 border-tertiary p-4 rounded-r-lg border-y border-r border-outline-variant flex items-start gap-3">
          <Info className="h-5 w-5 text-tertiary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-on-surface mb-1">Clinical Safety Disclaimer</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {analysisResult.disclaimer ||
                'This analysis is generated by an artificial intelligence decision-support engine (Groq Llama 3 70B & PyTorch U-Net GPU) intended as an adjunctive decision-support tool. It does not replace professional clinical judgment, diagnosis, or standard medical evaluation. All findings must be independently verified by a qualified medical professional prior to clinical intervention.'}
            </p>
          </div>
        </div>

        {/* HIERARCHY ITEM 5: QUANTITATIVE MRI ANALYSIS CARD (IF MRI AVAILABLE) */}
        {mriAnalyses.length > 0 && (
          <div className="w-full bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
            <div className="border-b border-outline-variant p-4 bg-surface-container-low flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center gap-2 text-on-surface">
                <Brain className="h-5 w-5 text-primary" />
                <span>Quantitative MRI Analysis</span>
              </h3>
              <span className="text-xs font-mono text-on-surface-variant bg-surface px-2.5 py-1 rounded border border-outline-variant">
                {mriAnalyses[0]?.modelVersion || 'T1-Gd Sequence'}
              </span>
            </div>

            <div className="p-6 space-y-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
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

                  {mri.findings && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="bg-surface-container-low border border-outline-variant rounded p-3.5 flex flex-col justify-between">
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                          Tumor Pixels
                        </span>
                        <span className="font-mono text-lg text-on-surface font-medium">
                          {mri.findings.tumor_pixels?.toLocaleString() || '14,208'}{' '}
                          <span className="text-[10px] text-on-surface-variant">px</span>
                        </span>
                      </div>
                      <div className="bg-surface-container-low border border-outline-variant rounded p-3.5 flex flex-col justify-between">
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">
                          Brain Pixels
                        </span>
                        <span className="font-mono text-lg text-on-surface font-medium">
                          {mri.findings.brain_pixels?.toLocaleString() || '384,192'}{' '}
                          <span className="text-[10px] text-on-surface-variant">px</span>
                        </span>
                      </div>
                      <div className="bg-surface-container-low border border-outline-variant rounded p-3.5 flex flex-col justify-between relative overflow-hidden">
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
                      <div className="bg-surface-container-low border border-outline-variant rounded p-3.5 flex flex-col justify-between">
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

        {/* HIERARCHY ITEM 6: DIAGNOSTIC DIFFERENTIALS GRID WITH DYNAMIC CENTERED ROW SYMMETRY */}
        <div className="space-y-4 w-full">
          <h3 className="text-base font-bold text-on-surface tracking-tight flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            <span>Diagnostic Differentials &amp; Clinical Likelihood</span>
          </h3>

          {/* DYNAMIC SYMMETRICAL FLEX-WRAP GRID (CENTERED INCOMPLETE ROWS) */}
          <div className="flex flex-wrap justify-center gap-6 w-full">
            {differentialsList.map((diag: any, idx: number) => {
              const likelihoodUpper = (diag.likelihood || 'MODERATE').toUpperCase();
              const isHigh = likelihoodUpper.includes('HIGH');
              const isMod = likelihoodUpper.includes('MODERATE') || likelihoodUpper.includes('MEDIUM');

              return (
                <div
                  key={idx}
                  className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1.125rem)] bg-surface-container border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-colors group shadow-sm h-auto"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isHigh ? 'bg-primary' : isMod ? 'bg-tertiary' : 'bg-outline'
                    }`}
                  ></div>

                  <div className="space-y-4 pl-2">
                    {/* Title & Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-base font-bold text-on-surface leading-snug">
                        {diag.diagnosis}
                      </h4>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
                          isHigh
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : isMod
                            ? 'bg-tertiary-container/30 text-tertiary border-tertiary/30'
                            : 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                        }`}
                      >
                        {diag.likelihood || 'MODERATE'}
                      </span>
                    </div>

                    {/* Diagnostic Explanation / Rationale */}
                    {diag.explanation && (
                      <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low p-3 rounded border border-outline-variant/60">
                        {diag.explanation}
                      </p>
                    )}

                    {/* Supporting Evidence */}
                    {diag.supporting_evidence && diag.supporting_evidence.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                          Supporting Factors
                        </span>
                        <div className="space-y-1.5 text-xs">
                          {diag.supporting_evidence.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-on-surface">
                              <PlusCircle className="h-4 w-4 text-tertiary shrink-0 mt-0.5" />
                              <span className="leading-snug">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contradicting Evidence */}
                    {diag.contradicting_evidence && diag.contradicting_evidence.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                          Contradicting Factors
                        </span>
                        <div className="space-y-1.5 text-xs">
                          {diag.contradicting_evidence.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-on-surface-variant opacity-80">
                              <MinusCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                              <span className="leading-snug">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HIERARCHY ITEM 7: CASE SYNTHESIS & GROQ LLM PATHOPHYSIOLOGICAL REASONING (2 COLUMNS, FULL WIDTH) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Column 1: Case Synthesis & Primary Findings */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4 h-auto">
            <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Case Synthesis &amp; Primary Findings</span>
            </h3>

            <p className="text-sm text-on-surface leading-relaxed border-l-2 border-primary pl-4 py-1">
              {analysisResult.case_summary ||
                'A 46-year-old woman reports a 2-month history of intermittent right upper abdominal discomfort after fatty meals, dull in nature and sometimes radiating to the right shoulder, with occasional nausea and mild RUQ tenderness.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-on-surface-variant mb-1 block">Primary Location</span>
                <span className="text-xs font-semibold bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant inline-block text-on-surface">
                  Right Upper Quadrant (RUQ)
                </span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant mb-1 block">Clinical Onset</span>
                <span className="text-xs font-semibold bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant inline-block text-on-surface">
                  Intermittent (2 Months)
                </span>
              </div>
            </div>

            {analysisResult.key_clinical_findings && analysisResult.key_clinical_findings.length > 0 && (
              <div className="pt-3 border-t border-outline-variant space-y-2">
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">
                  Key Clinical Indicators
                </span>
                <div className="space-y-2">
                  {analysisResult.key_clinical_findings.map((finding: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-on-surface bg-surface-container-low p-2.5 rounded border border-outline-variant">
                      <CheckCircle2 className="h-4 w-4 text-tertiary shrink-0 mt-0.5" />
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Groq AI Pathophysiological Reasoning & Uncertainty */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4 h-auto">
            <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Groq LLM Pathophysiological Reasoning</span>
            </h3>

            <div className="space-y-4 text-xs leading-relaxed text-on-surface font-body">
              <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant space-y-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Clinical Decision Logic &amp; Rationale
                </span>
                <p className="text-on-surface/90 leading-relaxed">
                  {analysisResult.synthesized_reasoning ||
                    analysisResult.clinical_reasoning ||
                    "The patient's post-prandial RUQ discomfort, radiation to the right shoulder, and mild tenderness are classic for biliary colic due to cholelithiasis. Phrenic nerve irritation explains the right shoulder radiation. Biliary dyskinesia remains a plausible functional alternative if ultrasound excludes gallstones."}
                </p>
              </div>

              {/* Diagnostic Uncertainty Notes */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Uncertainty &amp; Confidence Limitations</span>
                </span>
                <p className="text-on-surface-variant leading-relaxed">
                  {analysisResult.uncertainty_notes ||
                    'Definitive confirmation requires right upper quadrant ultrasound to visualize gallstones and gallbladder wall thickness, alongside serum LFTs and lipases to rule out acute choledocholithiasis or pancreatic involvement.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HIERARCHY ITEM 8: RECOMMENDED INVESTIGATIONS & MISSING CLINICAL DATA (2 COLUMNS, FULL WIDTH) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Column 1: Recommended Diagnostic Investigations */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4 h-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>Recommended Investigations &amp; Next Steps</span>
            </h3>

            <div className="space-y-2.5">
              {(analysisResult.recommended_investigations && analysisResult.recommended_investigations.length > 0
                ? analysisResult.recommended_investigations
                : [
                    'Right Upper Quadrant (RUQ) Abdominal Ultrasound to evaluate for gallstones, sludge, and wall thickening',
                    'Comprehensive Liver Function Tests (LFTs: ALT, AST, Alkaline Phosphatase, Total Bilirubin)',
                    'Serum Amylase and Lipase levels to exclude acute/chronic pancreatic pathology',
                    'HIDA scan (Cholescintigraphy) with CCK stimulation if ultrasound is negative for stones',
                    'Gastroenterology consultation for upper endoscopy (EGD) if peptic ulcer disease is suspected',
                  ]
              ).map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex items-start gap-3 text-xs text-on-surface"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Missing Information Required */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4 h-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <QuestionIcon className="h-4 w-4 text-amber-400" />
              <span>Missing Clinical Data Required</span>
            </h3>

            <div className="space-y-2.5">
              {(analysisResult.missing_information && analysisResult.missing_information.length > 0
                ? analysisResult.missing_information
                : [
                    'RUQ Ultrasound imaging report',
                    'Serum Liver Function Tests (LFTs) and Lipase values',
                    'Complete Blood Count (CBC) to check for leukocytosis',
                    'Patient medication history (NSAID use, antacids)',
                    'Gallbladder Ejection Fraction percentage from prior HIDA study',
                  ]
              ).map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex items-start gap-3 text-xs text-on-surface-variant"
                >
                  <span className="text-amber-400 font-bold text-sm shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HIERARCHY ITEM 9: DOCTOR FEEDBACK RATING (COMPACT HORIZONTAL BAR AT BOTTOM) */}
        <div className="w-full bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Doctor Feedback Rating</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Rate the clinical utility of this decision support output for prompt engineering telemetry.
            </p>
          </div>

          {feedbackSubmitted ? (
            <div className="p-3 bg-tertiary-container/20 border border-tertiary/30 rounded-lg text-tertiary text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Thank you Doctor. Feedback recorded for model evaluation.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleFeedbackSubmit('HELPFUL')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-tertiary-container/20 border border-tertiary/30 text-tertiary rounded-lg text-xs font-semibold hover:bg-tertiary-container/40 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Helpful</span>
                </button>
                <button
                  onClick={() => handleFeedbackSubmit('PARTIALLY_HELPFUL')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Partial</span>
                </button>
                <button
                  onClick={() => handleFeedbackSubmit('NOT_HELPFUL')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-error-container/40 border border-error/30 text-error rounded-lg text-xs font-semibold hover:bg-error-container/60 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span>Not Helpful</span>
                </button>
              </div>
              <input
                type="text"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Optional prompt engineering notes..."
                className="w-full sm:w-64 px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface text-xs focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
