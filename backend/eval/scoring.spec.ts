import { readFileSync } from 'fs';
import * as path from 'path';
import { ClinicalResponseSchema } from '../src/modules/safety/dto/clinical-response.schema';
import { EvalCase, scoreCase } from './scoring';

const output = (severity: string, text: string) =>
  ClinicalResponseSchema.parse({
    case_summary: text,
    differential_diagnoses: [{ diagnosis: text, likelihood: 'high' }],
    alert: { severity, items: [] },
  });

describe('eval scoring', () => {
  const base: EvalCase = { id: 'x', caseText: 't', minSeverity: 'critical', requiredConcepts: [['stroke', 'ischemi']] };

  it('passes when severity and concepts match', () => {
    expect(scoreCase(base, output('critical', 'Acute ischemic stroke'), []).passed).toBe(true);
  });

  it('fails on under-triage and missing concepts', () => {
    const r = scoreCase(base, output('moderate', 'Migraine'), []);
    expect(r.passed).toBe(false);
    expect(r.failures).toHaveLength(2);
  });

  it('fails on over-triage, missing flags and missing output', () => {
    expect(scoreCase({ id: 'y', caseText: 't', maxSeverity: 'moderate' }, output('critical', 'x'), []).passed).toBe(false);
    expect(scoreCase({ id: 'z', caseText: 't', expectFlags: ['possible_prompt_injection'] }, output('low', 'x'), []).passed).toBe(false);
    expect(scoreCase(base, null, [], 'timeout').failures[0]).toMatch(/timeout/);
  });

  it('ships a well-formed synthetic case set', () => {
    const { cases } = JSON.parse(readFileSync(path.join(__dirname, 'cases.json'), 'utf8')) as { cases: EvalCase[] };
    expect(cases.length).toBeGreaterThanOrEqual(5);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });
});
