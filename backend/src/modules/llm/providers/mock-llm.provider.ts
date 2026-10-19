import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, RawLLMResponse } from '../interfaces/llm-provider.interface';

export const MOCK_MODEL_NAME = 'mock-llm (development only - not a clinical model)';

/**
 * Deterministic stand-in used only when LLM_MOCK=true (never allowed in production).
 * Output is clearly synthetic and is stored with isMock=true so the UI labels it.
 */
@Injectable()
export class MockLlmProvider implements LLMProvider {
  private readonly logger = new Logger(MockLlmProvider.name);

  async generateClinicalAnalysis(userPrompt: string): Promise<RawLLMResponse> {
    this.logger.warn('Returning MOCK clinical analysis (LLM_MOCK=true).');
    return {
      content: JSON.stringify({
        case_summary: 'SYNTHETIC OUTPUT FROM THE DEVELOPMENT MOCK PROVIDER. This is not an analysis of the submitted case.',
        key_clinical_findings: ['Mock output: no clinical findings were extracted'],
        missing_information: ['Mock output: configure a real LLM provider to obtain an analysis'],
        differential_diagnoses: [
          {
            diagnosis: 'MOCK PLACEHOLDER - not a diagnosis',
            likelihood: 'low',
            supporting_evidence: ['Mock output'],
            contradicting_evidence: ['Mock output'],
          },
        ],
        alert: {
          severity: 'low',
          title: 'MOCK OUTPUT - NO CLINICAL ASSESSMENT PERFORMED',
          summary: 'The development mock provider does not assess urgency.',
          items: ['Mock output: urgency was not assessed'],
        },
        red_flags: ['Mock output: urgency was not assessed'],
        recommended_investigations: ['Mock output: no recommendations'],
        clinical_reasoning: 'Mock output.',
        uncertainty_notes: 'Mock output; no reasoning was performed.',
      }),
      model: MOCK_MODEL_NAME,
      tokenUsage: { promptTokens: Math.ceil(userPrompt.length / 4), completionTokens: 0, totalTokens: Math.ceil(userPrompt.length / 4) },
      latencyMs: 0,
      isMock: true,
    };
  }
}
