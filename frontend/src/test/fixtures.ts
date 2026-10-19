import type { Analysis, CaseDetail, ClinicalResult, MriAnalysis } from '@/lib/types';

export const result = (overrides: Partial<ClinicalResult> = {}): ClinicalResult => ({
  case_summary: 'Model summary of this specific case.',
  key_clinical_findings: ['Finding A'],
  missing_information: ['Missing B'],
  differential_diagnoses: [{ diagnosis: 'Migraine without aura', likelihood: 'moderate', supporting_evidence: ['photophobia'], contradicting_evidence: [] }],
  red_flags: [],
  alert: { severity: 'low', title: 'LOW', summary: 'No urgent features listed.', items: [] },
  recommended_investigations: ['Neurological examination'],
  clinical_reasoning: 'Reasoning text.',
  uncertainty_notes: 'Uncertainty text.',
  disclaimer: 'Server disclaimer.',
  ...overrides,
});

export const analysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  id: 'a1',
  caseId: 'c1',
  status: 'SUCCESS',
  modelName: 'model-x',
  promptVersion: 'v1.5.0',
  promptHash: 'f'.repeat(64),
  isMock: false,
  latencyMs: 1200,
  errorCode: null,
  safetyFlags: [],
  result: result(),
  createdAt: '2026-10-19T10:00:00.000Z',
  ...overrides,
});

export const mri = (overrides: Partial<MriAnalysis> = {}): MriAnalysis => ({
  id: 'm1',
  caseId: 'c1',
  originalFilename: 'slice.png',
  status: 'COMPLETED',
  errorMessage: null,
  modelVersion: 'unet_v1.2.0',
  processingTimeMs: 50,
  findings: { segmentedPixels: 0, foregroundPixels: 900, areaPercent: 0, sqrtAreaPercent: 0, analysisResolution: 128 },
  artifacts: { original: true, mask: true, overlay: true },
  createdAt: '2026-10-19T10:00:00.000Z',
  ...overrides,
});

export const caseDetail = (overrides: Partial<CaseDetail> = {}): CaseDetail => ({
  id: 'c1',
  status: 'COMPLETED',
  caseText: 'Headache for three days.',
  patientContext: { ageGroup: 'adult', sex: 'not_specified', acuity: 'acute', historyTags: [] },
  organizationId: null,
  doctor: { id: 'd1', fullName: 'Dr Real Name' },
  canAct: true,
  createdAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-19T10:00:00.000Z',
  analyses: [analysis()],
  mriAnalyses: [],
  ...overrides,
});

/** Strings that the previous implementation invented when data was missing. */
export const FABRICATED = [/biliary/i, /cholelithiasis/i, /right upper quadrant/i, /RUQ/, /Intermittent \(2 Months\)/, /Dr\. Shrey Tank/, /14,208/, /384,192/, /3\.7%/, /18\.4%/];
