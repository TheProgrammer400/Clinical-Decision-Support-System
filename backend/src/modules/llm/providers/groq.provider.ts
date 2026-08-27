import { Injectable, Logger, ServiceUnavailableException, GatewayTimeoutException, InternalServerErrorException } from '@nestjs/common';
import { LLMProvider, RawLLMResponse } from '../interfaces/llm-provider.interface';
import { AppConfigService } from '../../config/config.service';
import Groq from 'groq-sdk';

export class CircuitBreakerOpenException extends ServiceUnavailableException {
  constructor(message = 'Groq LLM service is temporarily unavailable due to repeated failures (Circuit Breaker Open)') {
    super(message);
  }
}

@Injectable()
export class GroqProvider implements LLMProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private groqClient: Groq | null = null;
  
  // Simple in-memory Circuit Breaker state
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private circuitOpenUntil = 0;
  private readonly cooldownPeriodMs = 30000; // 30 seconds cooldown

  constructor(private readonly configService: AppConfigService) {
    const apiKey = this.configService.groqApiKey;
    if (apiKey && apiKey !== 'gsk_your_groq_api_key_here' && !apiKey.startsWith('gsk_mock')) {
      this.groqClient = new Groq({ apiKey });
    } else {
      this.logger.warn('Groq API Key not configured or set to placeholder/mock value. Mock mode active for non-live calls.');
    }
  }

  private checkCircuitBreaker(): void {
    const now = Date.now();
    if (this.circuitOpenUntil > now) {
      const remainingSecs = Math.ceil((this.circuitOpenUntil - now) / 1000);
      throw new CircuitBreakerOpenException(`Groq service circuit breaker open. Cooldown active for ${remainingSecs}s.`);
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpenUntil = Date.now() + this.cooldownPeriodMs;
      this.logger.error(`Circuit Breaker tripped for GroqProvider after ${this.failureCount} consecutive failures. Cooldown: ${this.cooldownPeriodMs}ms`);
    }
  }

  async generateClinicalAnalysis(userPrompt: string, systemPrompt?: string): Promise<RawLLMResponse> {
    this.checkCircuitBreaker();
    const startTime = Date.now();

    // Mock response fallback if client is not configured (for dev/test without API key)
    if (!this.groqClient) {
      this.logger.log('Generating mock clinical response (Groq API Key not configured)');
      const latencyMs = Date.now() - startTime + 150;
      return {
        content: JSON.stringify({
          case_summary: "The patient presents with symptoms requiring clinical investigation based on history provided.",
          key_clinical_findings: ["Narrative clinical case presented", "Symptoms documented"],
          missing_information: ["Detailed vital signs", "Recent laboratory results", "Medication history"],
          differential_diagnoses: [
            {
              diagnosis: "Primary Clinical Consideration",
              likelihood: "moderate",
              supporting_evidence: ["Reported clinical symptoms"],
              contradicting_evidence: ["Awaiting laboratory verification"]
            },
            {
              diagnosis: "Secondary Differential Consideration",
              likelihood: "low",
              supporting_evidence: ["Secondary clinical markers"],
              contradicting_evidence: ["Non-specific presentation"]
            }
          ],
          red_flags: ["Rule out acute ischemic or emergent cardiovascular conditions if severe symptom onset"],
          recommended_investigations: ["Complete Blood Count (CBC)", "Basic Metabolic Panel (BMP)", "Targeted diagnostic imaging"],
          clinical_reasoning: "Synthetic decision-support output generated for evaluation.",
          uncertainty_notes: "Qualitative assessment based strictly on user-provided narrative text without objective exam metrics.",
          disclaimer: "THIS SYSTEM IS A DECISION SUPPORT TOOL AND DOES NOT PROVIDE FINAL MEDICAL DIAGNOSIS OR PRESCRIPTIONS."
        }),
        model: this.configService.groqModelName,
        tokenUsage: {
          promptTokens: 350,
          completionTokens: 280,
          totalTokens: 630,
        },
        latencyMs,
      };
    }

    const modelName = this.configService.groqModelName;
    const timeoutMs = this.configService.groqRequestTimeoutMs;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new GatewayTimeoutException(`Groq API request timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userPrompt });

      const apiCallPromise = this.groqClient.chat.completions.create({
        model: modelName,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for deterministic clinical reasoning
        max_tokens: 2048,
      });

      const completion = (await Promise.race([apiCallPromise, timeoutPromise])) as Groq.Chat.Completions.ChatCompletion;
      const latencyMs = Date.now() - startTime;

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new InternalServerErrorException('Groq API returned an empty completion content');
      }

      this.recordSuccess();

      return {
        content,
        model: completion.model || modelName,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        latencyMs,
      };
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Groq API invocation failed: ${error.message}`, error.stack);
      if (error instanceof GatewayTimeoutException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new InternalServerErrorException(`Groq LLM Service Error: ${error.message}`);
    }
  }
}
