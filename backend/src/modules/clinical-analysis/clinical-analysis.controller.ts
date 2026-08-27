import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ClinicalAnalysisService } from './clinical-analysis.service';
import { DoctorFeedbackDto } from './dto/feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('clinical-analysis')
@UseGuards(JwtAuthGuard)
export class ClinicalAnalysisController {
  constructor(private readonly analysisService: ClinicalAnalysisService) {}

  @Post(':id/feedback')
  async submitFeedback(
    @Param('id') analysisId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: DoctorFeedbackDto,
  ) {
    return this.analysisService.submitFeedback(analysisId, userId, dto);
  }
}
