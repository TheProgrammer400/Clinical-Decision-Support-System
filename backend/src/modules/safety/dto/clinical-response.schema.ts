import { z } from 'zod';

export const LikelihoodEnum = z.enum(['high', 'moderate', 'low']);
export const AlertSeverityEnum = z.enum(['critical', 'moderate', 'low']);

export const DifferentialDiagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  likelihood: LikelihoodEnum,
  supporting_evidence: z.array(z.string()).default([]),
  contradicting_evidence: z.array(z.string()).default([]),
});

export const ClinicalAlertSchema = z.object({
  severity: AlertSeverityEnum,
  title: z.string().optional(),
  summary: z.string().optional(),
  items: z.array(z.string()).default([]),
});

export const ClinicalResponseSchema = z.object({
  case_summary: z.string().min(1, 'Case summary is required'),
  key_clinical_findings: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  differential_diagnoses: z.array(DifferentialDiagnosisSchema).min(1, 'At least one differential diagnosis required').max(10),
  red_flags: z.array(z.string()).default([]),
  alert: ClinicalAlertSchema.optional(),
  recommended_investigations: z.array(z.string()).default([]),
  clinical_reasoning: z.string().default(''),
  uncertainty_notes: z.string().default(''),
  disclaimer: z.string().optional(),
});

export type ClinicalAnalysisResponse = z.infer<typeof ClinicalResponseSchema>;
