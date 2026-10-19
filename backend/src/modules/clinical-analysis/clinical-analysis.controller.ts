import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicalAnalysisService } from './clinical-analysis.service';
import { DoctorFeedbackDto } from './dto/feedback.dto';

@Controller('clinical-analysis')
@UseGuards(JwtAuthGuard)
export class ClinicalAnalysisController {
  constructor(private readonly analysisService: ClinicalAnalysisService) {}

  @Post(':id/feedback')
  submitFeedback(@Param('id', ParseUUIDPipe) analysisId: string, @CurrentUser() user: AuthUser, @Body() dto: DoctorFeedbackDto) {
    return this.analysisService.submitFeedback(user, analysisId, dto);
  }
}
