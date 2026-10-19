export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RawLLMResponse {
  content: string;
  /** The model identifier reported by the provider (not merely the configured name). */
  model: string;
  tokenUsage: TokenUsage;
  latencyMs: number;
  /** True only for the explicit development mock. Persisted and shown to clinicians. */
  isMock: boolean;
}

export type LlmErrorCode = 'LLM_TIMEOUT' | 'LLM_RATE_LIMITED' | 'LLM_UNAVAILABLE' | 'LLM_EMPTY_RESPONSE' | 'LLM_REQUEST_REJECTED';

/** Provider failure with a stable code. The message is for logs only, never for clients. */
export class LlmProviderError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
    readonly retriable: boolean,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}

export const LLM_PROVIDER = 'LLMProvider';

export interface LLMProvider {
  generateClinicalAnalysis(userPrompt: string, systemPrompt: string): Promise<RawLLMResponse>;
}
