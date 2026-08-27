import { Injectable, Inject, Logger, NotFoundException, InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LLMProvider } from '../llm/interfaces/llm-provider.interface';
import { PromptsService } from '../prompts/prompts.service';
import { SafetyService } from '../safety/safety.service';
import { AuditService } from '../audit/audit.service';
import { DoctorFeedbackDto } from './dto/feedback.dto';
import { CaseStatus, AnalysisStatus } from '@prisma/client';

@Injectable()
export class ClinicalAnalysisService {
  private readonly logger = new Logger(ClinicalAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LLMProvider') private readonly llmProvider: LLMProvider,
    private readonly promptsService: PromptsService,
    private readonly safetyService: SafetyService,
    private readonly auditService: AuditService,
  ) {}

  async analyzeCase(caseId: string, userId: string) {
    const clinicalCase = await this.prisma.clinicalCase.findUnique({
      where: { id: caseId },
    });

    if (!clinicalCase) {
      throw new NotFoundException('Clinical case not found');
    }

    const promptPackage = this.promptsService.buildClinicalPrompt(
      clinicalCase.caseText,
      clinicalCase.patientContext as Record<string, any>,
    );

    let rawResponse;
    let validatedAnalysis;
    let analysisStatus: AnalysisStatus = AnalysisStatus.SUCCESS;

    try {
      // Primary Groq LLM Inference call
      rawResponse = await this.llmProvider.generateClinicalAnalysis(
        promptPackage.userPrompt,
        promptPackage.systemPrompt,
      );

      try {
        validatedAnalysis = this.safetyService.validateAndSanitize(rawResponse.content);
      } catch (valError) {
        this.logger.warn(`Primary LLM output failed schema/safety validation. Attempting bounded 1-retry with strict corrective prompt. Error: ${valError.message}`);
        
        // Corrective retry attempt
        const correctivePrompt = `${promptPackage.userPrompt}\n\nATTENTION RECOVERY INSTRUCTION: Your previous output was invalid. YOU MUST RETURN ONLY VALID STRICT JSON MATCHING THE EXACT SCHEMA SPECIFIED ABOVE. NO MARKDOWN TRIPLE BACKTICKS. NO EXTRA TEXT.`;
        
        rawResponse = await this.llmProvider.generateClinicalAnalysis(correctivePrompt, promptPackage.systemPrompt);
        validatedAnalysis = this.safetyService.validateAndSanitize(rawResponse.content);
      }
    } catch (error) {
      this.logger.error(`Clinical analysis execution failed for caseId=${caseId}: ${error.message}`);
      analysisStatus = error instanceof UnprocessableEntityException ? AnalysisStatus.VALIDATION_FAILED : AnalysisStatus.GROQ_ERROR;

      // Transactionally save failed analysis record & update case status
      await this.prisma.$transaction([
        this.prisma.clinicalAnalysis.create({
          data: {
            clinicalCaseId: caseId,
            modelName: rawResponse?.model || 'unknown',
            promptVersion: promptPackage.version,
            responseJson: {},
            rawTokenUsage: rawResponse?.tokenUsage || {},
            latencyMs: rawResponse?.latencyMs || 0,
            status: analysisStatus,
          },
        }),
        this.prisma.clinicalCase.update({
          where: { id: caseId },
          data: { status: CaseStatus.FAILED },
        }),
      ]);

      await this.auditService.log({
        actorUserId: userId,
        action: 'analysis.failed',
        resourceType: 'ClinicalCase',
        resourceId: caseId,
        metadata: { status: analysisStatus, error: error.message },
      });

      throw new InternalServerErrorException(`Clinical case analysis failed: ${error.message}`);
    }

    // Success transaction: Create Analysis & Update Case Status to COMPLETED
    const [analysis] = await this.prisma.$transaction([
      this.prisma.clinicalAnalysis.create({
        data: {
          clinicalCaseId: caseId,
          modelName: rawResponse.model,
          promptVersion: promptPackage.version,
          responseJson: validatedAnalysis as any,
          rawTokenUsage: rawResponse.tokenUsage as any,
          latencyMs: rawResponse.latencyMs,
          status: AnalysisStatus.SUCCESS,
        },
      }),
      this.prisma.clinicalCase.update({
        where: { id: caseId },
        data: { status: CaseStatus.COMPLETED },
      }),
    ]);

    await this.auditService.log({
      actorUserId: userId,
      action: 'analysis.complete',
      resourceType: 'ClinicalAnalysis',
      resourceId: analysis.id,
      metadata: {
        caseId,
        modelName: rawResponse.model,
        promptVersion: promptPackage.version,
        latencyMs: rawResponse.latencyMs,
        tokens: rawResponse.tokenUsage,
      },
    });

    return {
      analysisId: analysis.id,
      caseId,
      status: analysis.status,
      modelName: analysis.modelName,
      promptVersion: analysis.promptVersion,
      latencyMs: analysis.latencyMs,
      result: validatedAnalysis,
      createdAt: analysis.createdAt,
    };
  }

  async submitFeedback(analysisId: string, doctorId: string, dto: DoctorFeedbackDto) {
    const analysis = await this.prisma.clinicalAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      throw new NotFoundException('Clinical analysis record not found');
    }

    const feedback = await this.prisma.doctorFeedback.create({
      data: {
        clinicalAnalysisId: analysisId,
        doctorId,
        rating: dto.rating,
        comment: dto.comment || null,
      },
    });

    await this.auditService.log({
      actorUserId: doctorId,
      action: 'analysis.feedback',
      resourceType: 'DoctorFeedback',
      resourceId: feedback.id,
      metadata: { analysisId, rating: dto.rating },
    });

    return feedback;
  }
}
