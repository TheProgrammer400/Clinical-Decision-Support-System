import { Module } from '@nestjs/common';
import { GroqProvider } from './providers/groq.provider';

@Module({
  providers: [
    GroqProvider,
    {
      provide: 'LLMProvider',
      useExisting: GroqProvider,
    },
  ],
  exports: ['LLMProvider', GroqProvider],
})
export class LlmModule {}
