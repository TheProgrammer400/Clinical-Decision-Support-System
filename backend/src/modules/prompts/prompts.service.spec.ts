import { Test, TestingModule } from '@nestjs/testing';
import { PromptsService } from './prompts.service';
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
          useValue: { promptVersion: 'v1.3.0' },
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  it('should build prompt package wrapping clinical case text in delimiters', () => {
    const pkg = service.buildClinicalPrompt('Patient with chest pain radiating to left arm');
    expect(pkg.version).toBe('v1.3.0');
    expect(pkg.systemPrompt).toContain('SYSTEM ROLE');
    expect(pkg.userPrompt).toContain('<<<CLINICAL_CASE_TEXT>>>');
    expect(pkg.userPrompt).toContain('Patient with chest pain radiating to left arm');
    expect(pkg.userPrompt).toContain('<<<END_CLINICAL_CASE_TEXT>>>');
  });

  it('should throw BadRequestException if case text is empty', () => {
    expect(() => service.buildClinicalPrompt('   ')).toThrow(BadRequestException);
  });
});
