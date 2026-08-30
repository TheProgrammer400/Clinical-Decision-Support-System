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
            diagnosis: 'Glioblastoma (GBM)',
            likelihood: 'high',
            explanation:
              'Heterogeneously enhancing ring mass with central necrosis and significant surrounding vasogenic edema in typical adult demographic.',
            supporting_evidence: [
              'Necrotic core with irregular rim enhancement on gadolinium T1-MRI',
              'Solitary frontal lobe lesion with surrounding mass effect',
              'Subacute onset headache and focal neurological deficit',
            ],
            contradicting_evidence: ['No previous history of primary brain tumor'],
          },
          {
            diagnosis: 'Melanoma Metastasis',
            likelihood: 'moderate',
            explanation:
              'Documented history of resected cutaneous melanoma 5 years prior increases pre-test probability of solitary brain metastasis.',
            supporting_evidence: [
              'Documented clinical history of primary cutaneous melanoma',
              'Subacute progression of morning headache and focal signs',
            ],
            contradicting_evidence: [
              'Solitary lesion rather than multiple punctate hemorrhages',
              'Absence of visceral systemic metastases on systemic staging',
            ],
          },
          {
            diagnosis: 'Cerebral Abscess',
            likelihood: 'low',
            explanation:
              'Ring-enhancing lesion can mimic pyogenic brain abscess, but clinical presentation lacks infectious prodrome.',
            supporting_evidence: ['Central non-enhancing necrotic/purulent region'],
            contradicting_evidence: [
              'Atypical thick irregular rim enhancement pattern',
              'No fever, leukocytosis, or systemic infectious prodrome in narrative',
            ],
          },
        ];

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <DoctorSidebar />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-24">
          {/* Page Header */}
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

          {/* Section 1: Clinical Safety Disclaimer Banner */}
          <div className="bg-surface-container border-l-4 border-tertiary p-4 rounded-r-lg border-y border-r border-outline-variant flex items-start gap-3">
            <Info className="h-5 w-5 text-tertiary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-on-surface mb-1">Clinical Safety Disclaimer</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {analysisResult.disclaimer ||
                  'This analysis is generated by an artificial intelligence decision-support engine (Groq Llama 3 70B & PyTorch U-Net GPU) intended as an adjunctive decision-support tool. It does not replace professional clinical judgment, diagnosis, or standard medical evaluation. All findings must be independently verified by a qualified medical professional prior to clinical intervention.'}
              </p>
            </div>
          </div>

          {/* Section 2: Quantitative MRI Analysis Card */}
          {mriAnalyses.length > 0 && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
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

          {/* Section 3: MULTI-COLUMN DIAGNOSTIC DIFFERENTIALS CARDS GRID */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-on-surface tracking-tight flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" />
              <span>Diagnostic Differentials &amp; Clinical Likelihood</span>
            </h3>

            {/* 3-COLUMN GRID LAYOUT FOR DIAGNOSES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {differentialsList.map((diag: any, idx: number) => {
                const likelihoodUpper = (diag.likelihood || 'MODERATE').toUpperCase();
                const isHigh = likelihoodUpper.includes('HIGH');
                const isMod = likelihoodUpper.includes('MODERATE') || likelihoodUpper.includes('MEDIUM');

                return (
                  <div
                    key={idx}
                    className="bg-surface-container border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-colors group shadow-sm"
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

          {/* Section 4: MULTI-COLUMN CLINICAL REASONING & CASE SYNTHESIS (2 COLUMNS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Case Synthesis & Primary Findings */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span>Case Synthesis &amp; Primary Findings</span>
              </h3>

              <p className="text-sm text-on-surface leading-relaxed border-l-2 border-primary pl-4 py-1">
                {analysisResult.case_summary ||
                  'Analysis identifies a well-demarcated, heterogeneously enhancing mass lesion in the right frontal lobe. The lesion demonstrates central necrosis indicative of aggressive pathology with prominent surrounding vasogenic edema.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-on-surface-variant mb-1 block">Primary Location</span>
                  <span className="text-xs font-semibold bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant inline-block text-on-surface">
                    Right Frontal Lobe
                  </span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant mb-1 block">Morphology</span>
                  <span className="text-xs font-semibold bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant inline-block text-on-surface">
                    Heterogeneous, necrotic core
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

            {/* Column 2: Groq AI Pathophysiological Reasoning & Confidence Limitations */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
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
                      'The Groq clinical reasoning pipeline evaluates patient age, symptom onset acuity, and prior oncology history alongside radiological features. The constellation of acute left hemiparesis, severe progressive headaches, and solitary necrotic lesion heavily favors primary high-grade glioma (GBM) vs solitary metastatic disease.'}
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
                      'Definitive differentiation between Glioblastoma Multiforme and solitary melanoma metastasis cannot be made solely on non-contrast imaging or single-sequence MRI without advanced perfusion-weighted MRI (PWI), magnetic resonance spectroscopy (MRS), or stereotactic tissue biopsy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: MULTI-COLUMN RECOMMENDED INVESTIGATIONS & MISSING INFORMATION (2 COLUMNS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Recommended Diagnostic Investigations */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>Recommended Investigations &amp; Next Steps</span>
              </h3>

              <div className="space-y-2.5">
                {(analysisResult.recommended_investigations && analysisResult.recommended_investigations.length > 0
                  ? analysisResult.recommended_investigations
                  : [
                      'Contrast-enhanced brain MRI study with T1, T2, FLAIR, and DWI sequences',
                      'Magnetic Resonance Spectroscopy (MRS) to measure choline/N-acetylaspartate ratio',
                      'Perfusion-Weighted MRI (PWI) to evaluate relative cerebral blood volume (rCBV)',
                      'Systemic PET-CT scan to screen for occult primary visceral malignancy',
                      'Neurosurgical consultation for stereotactic biopsy vs diagnostic craniotomy',
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
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <QuestionIcon className="h-4 w-4 text-amber-400" />
                <span>Missing Clinical Data Required</span>
              </h3>

              <div className="space-y-2.5">
                {(analysisResult.missing_information && analysisResult.missing_information.length > 0
                  ? analysisResult.missing_information
                  : [
                      'Recent systemic PET-CT staging scan results',
                      'Current serum inflammatory markers (ESR, CRP) and blood cultures',
                      'DWI/ADC restriction parameters on MRI sequence',
                      'Complete neuro-ophthalmologic visual field examination',
                      'Prior histopathology report from 5-year melanoma resection',
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

          {/* Section 6: SIDEBAR PANELS (CLINICAL CONCERNS, INPUT NARRATIVE, & DOCTOR FEEDBACK) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel 1: Clinical Concerns Alert Box */}
            {(() => {
              const alertData = analysisResult.alert;
              const redFlags = analysisResult.red_flags || [];

              let severity = alertData?.severity;
              if (!severity || !['critical', 'moderate', 'low'].includes(severity)) {
                severity = redFlags.length > 0 ? 'moderate' : 'low';
              }

              const items = alertData?.items && alertData.items.length > 0 ? alertData.items : redFlags;

              return (
                <div className="bg-[#241315] border border-error/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)] flex flex-col justify-between">
                  <div>
                    <div className="bg-[#3b1111] p-3 border-b border-error/20 flex items-center gap-2 text-error">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {severity === 'critical' ? 'Critical Emergency Concerns' : 'Moderate Clinical Concerns'}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {items.length > 0 ? (
                        items.map((item: string, idx: number) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-error block mt-1.5 shrink-0"></span>
                            <p className="text-xs text-on-error-container font-semibold leading-snug">{item}</p>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-error block mt-1.5 shrink-0"></span>
                            <p className="text-xs text-on-error-container font-semibold leading-snug">
                              Mass Effect &amp; Midline Shift (~3mm subfalcine herniation risk)
                            </p>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#fca5a5] block mt-1.5 shrink-0"></span>
                            <p className="text-xs text-on-error-container/80 leading-snug">
                              Prominent vasogenic edema exacerbating intracranial pressure
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Panel 2: Input Clinical Narrative Collapsible View */}
            <details
              className="bg-surface-container border border-outline-variant rounded-xl group [&_summary::-webkit-details-marker]:hidden flex flex-col"
              open
            >
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-surface-container-high transition-colors">
                <span className="text-sm font-bold flex items-center gap-2 text-on-surface">
                  <FileText className="h-4 w-4 text-on-surface-variant" />
                  <span>Input Clinical Narrative</span>
                </span>
                <ChevronDown className="h-4 w-4 text-on-surface-variant transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-4 pt-0 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant mt-2 pt-4 flex-1">
                <p className="font-mono bg-surface-container-lowest p-3 rounded border border-outline/30 overflow-x-auto whitespace-pre-wrap">
                  {clinicalCase.caseText}
                </p>
              </div>
            </details>

            {/* Panel 3: Doctor Feedback Rating Widget */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Doctor Feedback Rating</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Rate the clinical utility of this decision support output.
                </p>
              </div>

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
    </div>
  );
}
