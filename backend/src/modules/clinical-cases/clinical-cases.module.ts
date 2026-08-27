import { Module } from '@nestjs/common';
import { ClinicalCasesService } from './clinical-cases.service';
import { ClinicalCasesController } from './clinical-cases.controller';
import { ClinicalAnalysisModule } from '../clinical-analysis/clinical-analysis.module';

@Module({
  imports: [ClinicalAnalysisModule],
  controllers: [ClinicalCasesController],
  providers: [ClinicalCasesService],
  exports: [ClinicalCasesService],
})
export class ClinicalCasesModule {}
