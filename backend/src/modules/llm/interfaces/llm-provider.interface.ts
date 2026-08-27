export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RawLLMResponse {
  content: string;
  model: string;
  tokenUsage: TokenUsage;
  latencyMs: number;
}

export interface LLMProvider {
  generateClinicalAnalysis(userPrompt: string, systemPrompt?: string): Promise<RawLLMResponse>;
}
