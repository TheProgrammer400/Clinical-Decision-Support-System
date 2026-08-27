import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService, SERVER_FIXED_DISCLAIMER } from './safety.service';
import { UnprocessableEntityException } from '@nestjs/common';

describe('SafetyService', () => {
  let service: SafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SafetyService],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
  });

  it('should validate valid JSON and overwrite disclaimer with server fixed disclaimer', () => {
    const validJson = JSON.stringify({
      case_summary: 'Test case summary',
      key_clinical_findings: ['Fever', 'Cough'],
      missing_information: ['Chest X-Ray'],
      differential_diagnoses: [
        {
          diagnosis: 'Pneumonia',
          likelihood: 'high',
          supporting_evidence: ['Fever', 'Cough'],
          contradicting_evidence: [],
        },
      ],
      red_flags: ['Respiratory distress'],
      recommended_investigations: ['CBC'],
      clinical_reasoning: 'Reasoning process',
      uncertainty_notes: 'Notes on uncertainty',
      disclaimer: 'LLM provided disclaimer that should be overwritten',
    });

    const result = service.validateAndSanitize(validJson);
    expect(result.case_summary).toBe('Test case summary');
    expect(result.differential_diagnoses[0].likelihood).toBe('high');
    expect(result.disclaimer).toBe(SERVER_FIXED_DISCLAIMER);
  });

  it('should throw UnprocessableEntityException when JSON is invalid or missing required fields', () => {
    const invalidJson = JSON.stringify({
      case_summary: 'Incomplete',
      // Missing differential_diagnoses
    });

    expect(() => service.validateAndSanitize(invalidJson)).toThrow(UnprocessableEntityException);
  });
});
