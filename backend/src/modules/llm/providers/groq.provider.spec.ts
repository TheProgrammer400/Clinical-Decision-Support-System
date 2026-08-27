import { Test, TestingModule } from '@nestjs/testing';
import { GroqProvider, CircuitBreakerOpenException } from './groq.provider';
import { AppConfigService } from '../../config/config.service';

describe('GroqProvider', () => {
  let provider: GroqProvider;

  const mockConfigService = {
    groqApiKey: 'gsk_mock_test_key',
    groqModelName: 'openai/gpt-oss-120b',
    groqRequestTimeoutMs: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroqProvider,
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<GroqProvider>(GroqProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should return mock response when initialized in test/mock key mode', async () => {
    const res = await provider.generateClinicalAnalysis('Patient has severe acute migraine.');
    expect(res).toBeDefined();
    expect(res.model).toBe('openai/gpt-oss-120b');
    expect(res.content).toContain('case_summary');
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.tokenUsage.promptTokens).toBeGreaterThan(0);
  });
});
