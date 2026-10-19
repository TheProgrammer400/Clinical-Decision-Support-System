import { OutputValidationError, SafetyService, SERVER_FIXED_DISCLAIMER } from './safety.service';

const valid = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    case_summary: 'Test case summary',
    key_clinical_findings: ['Fever', 'Cough'],
    missing_information: ['Chest X-Ray'],
    differential_diagnoses: [{ diagnosis: 'Pneumonia', likelihood: 'high', supporting_evidence: ['Fever'], contradicting_evidence: [] }],
    alert: { severity: 'moderate', title: 'MODERATE', summary: 's', items: ['Respiratory distress'] },
    red_flags: ['Respiratory distress'],
    recommended_investigations: ['CBC'],
    clinical_reasoning: 'Reasoning',
    uncertainty_notes: 'Notes',
    disclaimer: 'LLM disclaimer to be overwritten',
    ...overrides,
  });

describe('SafetyService', () => {
  const service = new SafetyService();

  it('accepts valid output and always overwrites the disclaimer', () => {
    const { data, flags } = service.validateAndSanitize(valid());
    expect(data.case_summary).toBe('Test case summary');
    expect(data.differential_diagnoses[0].likelihood).toBe('high');
    expect(data.disclaimer).toBe(SERVER_FIXED_DISCLAIMER);
    expect(flags).toEqual([]);
  });

  it.each([
    ['not JSON', 'definitely not json'],
    ['missing differentials', JSON.stringify({ case_summary: 'x' })],
    ['empty differentials', valid({ differential_diagnoses: [] })],
    ['numeric likelihood', valid({ differential_diagnoses: [{ diagnosis: 'x', likelihood: '70%' }] })],
    ['empty summary', valid({ case_summary: '   ' })],
    ['array root', '[]'],
  ])('rejects malformed output: %s', (_name, input) => {
    expect(() => service.validateAndSanitize(input)).toThrow(OutputValidationError);
  });

  it('accepts JSON wrapped in a markdown code fence', () => {
    expect(service.validateAndSanitize('```json\n' + valid() + '\n```').data.case_summary).toBe('Test case summary');
  });

  it('flags dosing content instead of silently passing it', () => {
    const { flags } = service.validateAndSanitize(valid({ recommended_investigations: ['Give aspirin 300 mg PO stat'] }));
    expect(flags).toContain('dosage_content');
  });

  it('flags references to segmentation when no imaging was supplied', () => {
    const output = valid({ clinical_reasoning: 'The U-Net segmentation shows a lesion' });
    expect(service.validateAndSanitize(output, { hasImaging: false }).flags).toContain('imaging_reference_without_imaging');
    expect(service.validateAndSanitize(output, { hasImaging: true }).flags).not.toContain('imaging_reference_without_imaging');
  });

  it('infers a missing alert from red flags and labels it as inferred, without inventing items', () => {
    const { data, flags } = service.validateAndSanitize(valid({ alert: undefined, red_flags: [] }));
    expect(flags).toContain('severity_inferred');
    expect(data.alert?.severity).toBe('low');
    expect(data.alert?.items).toEqual([]);
    expect(data.alert?.summary).toMatch(/not a confirmation/);
  });

  it('treats an invalid alert severity as absent and flags it', () => {
    const { data, flags } = service.validateAndSanitize(valid({ alert: { severity: 'urgent', items: [] } }));
    expect(flags).toContain('severity_inferred');
    expect(data.alert?.severity).toBe('moderate');
    expect(data.alert?.items).toEqual(['Respiratory distress']);
  });
});
