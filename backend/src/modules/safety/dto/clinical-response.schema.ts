import { z } from 'zod';

export const LikelihoodEnum = z.enum(['high', 'moderate', 'low']);

export const DifferentialDiagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  likelihood: LikelihoodEnum,
  supporting_evidence: z.array(z.string()).default([]),
  contradicting_evidence: z.array(z.string()).default([]),
});

export const ClinicalResponseSchema = z.object({
  case_summary: z.string().min(1, 'Case summary is required'),
  key_clinical_findings: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  differential_diagnoses: z.array(DifferentialDiagnosisSchema).min(1, 'At least one differential diagnosis required').max(10),
  red_flags: z.array(z.string()).default([]),
  recommended_investigations: z.array(z.string()).default([]),
  clinical_reasoning: z.string().default(''),
  uncertainty_notes: z.string().default(''),
  disclaimer: z.string().optional(),
});

export type ClinicalAnalysisResponse = z.infer<typeof ClinicalResponseSchema>;
