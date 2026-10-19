import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { LLM_PROVIDER } from './interfaces/llm-provider.interface';
import { GroqProvider } from './providers/groq.provider';
import { MockLlmProvider } from './providers/mock-llm.provider';

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [AppConfigService],
      // The mock is only selected when explicitly requested; config validation forbids it in production.
      useFactory: (config: AppConfigService) => (config.llmMock ? new MockLlmProvider() : new GroqProvider(config)),
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
