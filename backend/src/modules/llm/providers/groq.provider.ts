import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { AppConfigService } from '../../config/config.service';
import { LLMProvider, LlmProviderError, RawLLMResponse } from '../interfaces/llm-provider.interface';

/** Thrown while the breaker is open; callers should not count it as another failure. */
export class CircuitBreakerOpenError extends LlmProviderError {
  constructor(remainingSeconds: number) {
    super('LLM_UNAVAILABLE', `Groq circuit breaker open for ${remainingSeconds}s`, true);
  }
}

@Injectable()
export class GroqProvider implements LLMProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq;

  private failureCount = 0;
  private readonly failureThreshold = 5;
  private circuitOpenUntil = 0;
  private readonly cooldownPeriodMs = 30_000;

  constructor(private readonly config: AppConfigService) {
    // Config validation guarantees a non-placeholder key when this provider is selected.
    this.client = new Groq({
      apiKey: config.groqApiKey,
      timeout: config.groqRequestTimeoutMs,
      // One SDK-level retry for connection errors, 408/409/429 and 5xx, with backoff.
      maxRetries: 1,
    });
  }

  async generateClinicalAnalysis(userPrompt: string, systemPrompt: string): Promise<RawLLMResponse> {
    const now = Date.now();
    if (this.circuitOpenUntil > now) {
      throw new CircuitBreakerOpenError(Math.ceil((this.circuitOpenUntil - now) / 1000));
    }

    const startTime = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.groqModelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4096,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new LlmProviderError('LLM_EMPTY_RESPONSE', 'Groq returned an empty completion', true);
      }
      this.recordSuccess();
      return {
        content,
        model: completion.model || this.config.groqModelName,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
        },
        latencyMs: Date.now() - startTime,
        isMock: false,
      };
    } catch (error) {
      const mapped = this.mapError(error);
      if (mapped.retriable) {
        // Only service-side problems count towards the breaker; a rejected request does not.
        this.recordFailure();
      }
      this.logger.error(`Groq call failed [${mapped.code}]: ${mapped.message}`);
      throw mapped;
    }
  }

  private mapError(error: unknown): LlmProviderError {
    if (error instanceof LlmProviderError) {
      return error;
    }
    if (error instanceof Groq.APIConnectionTimeoutError) {
      return new LlmProviderError('LLM_TIMEOUT', error.message, true);
    }
    if (error instanceof Groq.RateLimitError) {
      return new LlmProviderError('LLM_RATE_LIMITED', error.message, true);
    }
    if (error instanceof Groq.APIError && typeof error.status === 'number' && error.status < 500) {
      return new LlmProviderError('LLM_REQUEST_REJECTED', `HTTP ${error.status}: ${error.message}`, false);
    }
    const message = error instanceof Error ? error.message : String(error);
    return new LlmProviderError('LLM_UNAVAILABLE', message, true);
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpenUntil = Date.now() + this.cooldownPeriodMs;
      this.failureCount = 0;
      this.logger.error(`Groq circuit breaker opened for ${this.cooldownPeriodMs}ms after repeated failures`);
    }
  }
}
