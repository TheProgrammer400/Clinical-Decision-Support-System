import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuthUser, CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicalAnalysisService } from '../clinical-analysis/clinical-analysis.service';
import { ClinicalCasesService } from './clinical-cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('clinical-cases')
@UseGuards(JwtAuthGuard)
export class ClinicalCasesController {
  constructor(
    private readonly casesService: ClinicalCasesService,
    private readonly analysisService: ClinicalAnalysisService,
  ) {}

  @Post()
  createCase(@CurrentUser() user: AuthUser, @Body() dto: CreateCaseDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.casesService.createCase(user, dto, idempotencyKey);
  }

  @Get()
  listCases(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.casesService.listCases(user, query);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.casesService.getStats(user);
  }

  @Get(':id')
  getCaseById(@Param('id', ParseUUIDPipe) caseId: string, @CurrentUser() user: AuthUser) {
    return this.casesService.getCaseById(user, caseId);
  }

  @Get(':id/export')
  async exportCase(
    @Param('id', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Disposition', `attachment; filename="cdss-case-${caseId}.json"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return this.casesService.exportCase(user, caseId);
  }

  @Delete(':id')
  deleteCase(@Param('id', ParseUUIDPipe) caseId: string, @CurrentUser() user: AuthUser) {
    return this.casesService.deleteCase(user, caseId);
  }

  @Post(':id/analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyzeCase(@Param('id', ParseUUIDPipe) caseId: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.analyzeCase(user, caseId);
  }
}
