import { Module } from '@nestjs/common';
import { ClinicalAnalysisModule } from '../clinical-analysis/clinical-analysis.module';
import { MriModule } from '../mri/mri.module';
import { ClinicalCasesController } from './clinical-cases.controller';
import { ClinicalCasesService } from './clinical-cases.service';

@Module({
  imports: [ClinicalAnalysisModule, MriModule],
  controllers: [ClinicalCasesController],
  providers: [ClinicalCasesService],
  exports: [ClinicalCasesService],
})
export class ClinicalCasesModule {}
