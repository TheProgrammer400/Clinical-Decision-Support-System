import { Test, TestingModule } from '@nestjs/testing';
import { PromptsService, MriFindingForPrompt } from './prompts.service';
import { AppConfigService } from '../config/config.service';
import { BadRequestException } from '@nestjs/common';

describe('PromptsService', () => {
  let service: PromptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptsService,
        {
          provide: AppConfigService,
          useValue: { promptVersion: 'v1.4.0' },
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  it('should build prompt package wrapping clinical case text in delimiters', () => {
    const pkg = service.buildClinicalPrompt('Patient with chest pain radiating to left arm');
    expect(pkg.version).toBe('v1.4.0');
    expect(pkg.systemPrompt).toContain('SYSTEM ROLE');
    expect(pkg.userPrompt).toContain('<<<CLINICAL_CASE_TEXT>>>');
    expect(pkg.userPrompt).toContain('Patient with chest pain radiating to left arm');
    expect(pkg.userPrompt).toContain('<<<END_CLINICAL_CASE_TEXT>>>');
    expect(pkg.userPrompt).not.toContain('IMAGE-DERIVED U-NET FINDINGS:');
  });

  it('should append structured U-Net JSON findings and integration instructions when mriFindings is provided', () => {
    const mriFindings: MriFindingForPrompt[] = [
      {
        filename: 'brain_scan1.png',
        findings: {
          tumor_pixels: 405,
          brain_pixels: 7648,
          area_percent: 5.3,
          visual_width_span_percent: 23.0,
        },
      },
    ];

    const pkg = service.buildClinicalPrompt(
      'Patient presenting with persistent severe headaches and progressive ataxia.',
      { ageGroup: '51-65', sex: 'Male' },
      mriFindings,
    );

    expect(pkg.userPrompt).toContain('IMAGE-DERIVED U-NET FINDINGS:');
    expect(pkg.userPrompt).toContain('"brain_scan1.png"');
    expect(pkg.userPrompt).toContain('"tumor_pixels": 405');
    expect(pkg.userPrompt).toContain('"area_percent": 5.3');
    expect(pkg.userPrompt).toContain('U-NET INTEGRATION INSTRUCTIONS:');
  });

  it('should throw BadRequestException if case text is empty', () => {
    expect(() => service.buildClinicalPrompt('   ')).toThrow(BadRequestException);
  });
});
