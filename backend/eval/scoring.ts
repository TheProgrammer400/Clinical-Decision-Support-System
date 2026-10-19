import { ClinicalAnalysisResponse } from '../src/modules/safety/dto/clinical-response.schema';

export type Severity = 'low' | 'moderate' | 'critical';
const RANK: Record<Severity, number> = { low: 0, moderate: 1, critical: 2 };

export interface EvalCase {
  id: string;
  caseText: string;
  patientContext?: Record<string, unknown>;
  minSeverity?: Severity;
  maxSeverity?: Severity;
  /** Each inner list is a set of synonyms; at least one of each set must appear in the output. */
  requiredConcepts?: string[][];
  expectFlags?: string[];
}

export interface EvalOutcome {
  id: string;
  passed: boolean;
  failures: string[];
}

/** Scores one validated model output against the expectations of an eval case. */
export function scoreCase(c: EvalCase, output: ClinicalAnalysisResponse | null, flags: string[], error?: string): EvalOutcome {
  const failures: string[] = [];
  if (!output) {
    return { id: c.id, passed: false, failures: [`no valid output (${error ?? 'unknown error'})`] };
  }
  const severity = output.alert?.severity as Severity | undefined;
  if (c.minSeverity && (!severity || RANK[severity] < RANK[c.minSeverity])) {
    failures.push(`severity ${severity ?? 'missing'} below required ${c.minSeverity}`);
  }
  if (c.maxSeverity && severity && RANK[severity] > RANK[c.maxSeverity]) {
    failures.push(`severity ${severity} above allowed ${c.maxSeverity}`);
  }
  const text = JSON.stringify(output).toLowerCase();
  for (const synonyms of c.requiredConcepts ?? []) {
    if (!synonyms.some((s) => text.includes(s.toLowerCase()))) {
      failures.push(`missing concept: one of [${synonyms.join(', ')}]`);
    }
  }
  for (const flag of c.expectFlags ?? []) {
    if (!flags.includes(flag)) failures.push(`expected safety flag ${flag}`);
  }
  return { id: c.id, passed: failures.length === 0, failures };
}
