/** Types mirroring the backend API (backend/src). Keep in sync with the serializers there. */

export type Role = 'DOCTOR' | 'ORG_ADMIN' | 'SUPER_ADMIN';
export type CaseStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
export type AnalysisStatus = 'SUCCESS' | 'VALIDATION_FAILED' | 'GROQ_ERROR';
export type MriStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type Severity = 'critical' | 'moderate' | 'low';
export type Likelihood = 'high' | 'moderate' | 'low';
export type FeedbackRating = 'HELPFUL' | 'PARTIALLY_HELPFUL' | 'NOT_HELPFUL';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
}

export interface Differential {
  diagnosis: string;
  likelihood: Likelihood;
  supporting_evidence: string[];
  contradicting_evidence: string[];
}

export interface ClinicalResult {
  case_summary: string;
  key_clinical_findings: string[];
  missing_information: string[];
  differential_diagnoses: Differential[];
  red_flags: string[];
  alert?: { severity: Severity; title?: string; summary?: string; items: string[] };
  recommended_investigations: string[];
  clinical_reasoning: string;
  uncertainty_notes: string;
  disclaimer?: string;
}

export type SafetyFlag = 'possible_prompt_injection' | 'dosage_content' | 'imaging_reference_without_imaging' | 'severity_inferred';

export interface Analysis {
  id: string;
  caseId: string;
  status: AnalysisStatus;
  modelName: string;
  promptVersion: string;
  promptHash: string | null;
  isMock: boolean;
  latencyMs: number | null;
  errorCode: string | null;
  safetyFlags: SafetyFlag[];
  /** Always null unless status is SUCCESS. */
  result: ClinicalResult | null;
  createdAt: string;
  feedbackCount?: number;
}

export interface MriFindings {
  segmentedPixels: number | null;
  foregroundPixels: number | null;
  areaPercent: number | null;
  sqrtAreaPercent: number | null;
  analysisResolution: number | null;
}

export interface MriAnalysis {
  id: string;
  caseId: string;
  originalFilename: string;
  status: MriStatus;
  errorMessage: string | null;
  modelVersion: string;
  processingTimeMs: number | null;
  findings: MriFindings | null;
  artifacts: { original: boolean; mask: boolean; overlay: boolean };
  createdAt: string;
}

export interface PatientContext {
  ageGroup: 'pediatric' | 'adult' | 'geriatric' | 'not_specified';
  sex: 'm' | 'f' | 'other' | 'not_specified';
  acuity: 'hyperacute' | 'acute' | 'subacute' | 'chronic' | 'not_specified';
  historyTags?: string[];
}

export interface CaseDetail {
  id: string;
  status: CaseStatus;
  caseText: string;
  patientContext: PatientContext | null;
  organizationId: string | null;
  doctor: { id: string; fullName: string };
  canAct: boolean;
  createdAt: string;
  updatedAt: string;
  analyses: Analysis[];
  mriAnalyses: MriAnalysis[];
}

export interface CaseSummary {
  id: string;
  status: CaseStatus;
  caseTextPreview: string;
  createdAt: string;
  updatedAt: string;
  doctor: { id: string; fullName: string };
  mriCount: number;
  latestAnalysis: {
    id: string;
    status: AnalysisStatus;
    createdAt: string;
    modelName: string;
    isMock: boolean;
    alertSeverity: Severity | null;
  } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CaseStats {
  total: number;
  pending: number;
  analyzing: number;
  completed: number;
  failed: number;
  withMri: number;
  latestAlertSeverity: Record<Severity, number>;
}
