import { z } from 'zod';

export const LikelihoodEnum = z.enum(['high', 'moderate', 'low']);
export const AlertSeverityEnum = z.enum(['critical', 'moderate', 'low']);

const text = z.string().trim().min(1).max(4000);
const textList = z.array(text).max(50);

export const DifferentialDiagnosisSchema = z.object({
  diagnosis: text.max(300),
  likelihood: LikelihoodEnum,
  supporting_evidence: textList.default([]),
  contradicting_evidence: textList.default([]),
});

export const ClinicalAlertSchema = z.object({
  severity: AlertSeverityEnum,
  title: z.string().max(300).optional(),
  summary: z.string().max(2000).optional(),
  items: textList.default([]),
});

/**
 * Required clinical sections must be present. Optional narrative fields default to empty and
 * are rendered as "not provided" by the UI, never replaced with invented content.
 */
export const ClinicalResponseSchema = z.object({
  case_summary: text.max(4000),
  key_clinical_findings: textList.default([]),
  missing_information: textList.default([]),
  differential_diagnoses: z.array(DifferentialDiagnosisSchema).min(1, 'At least one differential diagnosis required').max(10),
  red_flags: textList.default([]),
  // An invalid alert object is treated as absent (and flagged) rather than failing the analysis.
  alert: ClinicalAlertSchema.optional().catch(undefined),
  recommended_investigations: textList.default([]),
  clinical_reasoning: z.string().max(8000).default(''),
  uncertainty_notes: z.string().max(4000).default(''),
  disclaimer: z.string().optional(),
});

export type ClinicalAnalysisResponse = z.infer<typeof ClinicalResponseSchema>;
