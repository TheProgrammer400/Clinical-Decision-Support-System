import { Controller, Post, Get, Param, Body, Headers, Query, UseGuards, Sse } from '@nestjs/common';
import { Observable, fromEvent, interval, map, take } from 'rxjs';
import { ClinicalCasesService } from './clinical-cases.service';
import { ClinicalAnalysisService } from '../clinical-analysis/clinical-analysis.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('clinical-cases')
@UseGuards(JwtAuthGuard)
export class ClinicalCasesController {
  constructor(
    private readonly casesService: ClinicalCasesService,
    private readonly analysisService: ClinicalAnalysisService,
  ) {}

  @Post()
  async createCase(
    @CurrentUser('userId') userId: string,
    @CurrentUser('organizationId') orgId: string | undefined,
    @Body() dto: CreateCaseDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.casesService.createCase(userId, orgId, dto, idempotencyKey);
  }

  @Get()
  async listCases(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') orgId: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.casesService.listCases(userId, role, orgId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  async getCaseById(
    @Param('id') caseId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') orgId: string | undefined,
  ) {
    return this.casesService.getCaseById(caseId, userId, role, orgId);
  }

  @Post(':id/analyze')
  async analyzeCase(
    @Param('id') caseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.analysisService.analyzeCase(caseId, userId);
  }

  @Sse(':id/analysis/stream')
  streamAnalysisStatus(@Param('id') caseId: string): Observable<MessageEvent> {
    // SSE Stream emitting progressive thinking status indicators
    const steps = [
      'Authenticating clinical case evaluation request...',
      'Sanitizing clinical narrative input...',
      'Constructing versioned system & safety prompts...',
      'Invoking Groq LLM inference service...',
      'Validating structured output schema & qualitative likelihood metrics...',
      'Applying clinical safety filters & fixed disclaimer...',
      'Analysis completed successfully.',
    ];

    return interval(1200).pipe(
      take(steps.length),
      map((index) => {
        return {
          data: JSON.stringify({
            step: index + 1,
            totalSteps: steps.length,
            message: steps[index],
            timestamp: new Date().toISOString(),
          }),
        } as MessageEvent;
      }),
    );
  }
}
