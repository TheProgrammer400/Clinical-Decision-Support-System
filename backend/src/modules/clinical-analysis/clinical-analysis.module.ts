import { Module } from '@nestjs/common';
import { ClinicalAnalysisService } from './clinical-analysis.service';
import { ClinicalAnalysisController } from './clinical-analysis.controller';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { SafetyModule } from '../safety/safety.module';

@Module({
  imports: [LlmModule, PromptsModule, SafetyModule],
  controllers: [ClinicalAnalysisController],
  providers: [ClinicalAnalysisService],
  exports: [ClinicalAnalysisService],
})
export class ClinicalAnalysisModule {}
