import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AnalysisStatus, CaseStatus, MriStatus, Prisma } from '@prisma/client';
import { CaseAccessService } from '../../common/policies/case-access.service';
import { AuthUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LLM_PROVIDER, LLMProvider, LlmProviderError, RawLLMResponse } from '../llm/interfaces/llm-provider.interface';
import { normalizeMriFindings } from '../mri/mri-findings';
import { PromptsService } from '../prompts/prompts.service';
import { OutputValidationError, SafetyFlag, SafetyService, ValidatedAnalysis } from '../safety/safety.service';
import { DoctorFeedbackDto } from './dto/feedback.dto';

/** An ANALYZING lock older than this is considered abandoned (e.g. process crash). */
const STALE_LOCK_MS = 5 * 60_000;

const CORRECTIVE_SUFFIX =
  '\n\nATTENTION: Your previous output was not valid. Return ONLY one valid JSON object matching the schema above. No markdown, no extra text.';

@Injectable()
export class ClinicalAnalysisService {
  private readonly logger = new Logger(ClinicalAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LLMProvider,
    private readonly promptsService: PromptsService,
    private readonly safetyService: SafetyService,
    private readonly auditService: AuditService,
    private readonly caseAccess: CaseAccessService,
  ) {}

  async analyzeCase(user: AuthUser, caseId: string) {
    const clinicalCase = await this.caseAccess.getCaseOrThrow(user, caseId, 'act');
    await this.acquireLock(caseId);

    try {
      const mriRecords = await this.prisma.mriAnalysis.findMany({
        where: { clinicalCaseId: caseId, status: MriStatus.COMPLETED },
        orderBy: { createdAt: 'asc' },
      });
      const mriFindings = mriRecords
        .map((r) => ({ filename: r.originalFilename, findings: normalizeMriFindings(r.findings) }))
        .filter((r): r is { filename: string; findings: NonNullable<typeof r.findings> } => r.findings !== null);

      const prompt = this.promptsService.buildClinicalPrompt(
        clinicalCase.caseText,
        clinicalCase.patientContext as Record<string, unknown> | null,
        mriFindings,
      );
      const hasImaging = mriFindings.some((m) => m.findings.segmentedPixels !== null);

      let response: RawLLMResponse | undefined;
      let validated: ValidatedAnalysis | undefined;
      let failure: { status: AnalysisStatus; code: string; detail: string } | undefined;

      try {
        response = await this.llmProvider.generateClinicalAnalysis(prompt.userPrompt, prompt.systemPrompt);
        try {
          validated = this.safetyService.validateAndSanitize(response.content, { hasImaging });
        } catch (err) {
          if (!(err instanceof OutputValidationError)) throw err;
          this.logger.warn(`caseId=${caseId}: output invalid (${err.message}); one corrective retry.`);
          response = await this.llmProvider.generateClinicalAnalysis(prompt.userPrompt + CORRECTIVE_SUFFIX, prompt.systemPrompt);
          validated = this.safetyService.validateAndSanitize(response.content, { hasImaging });
        }
      } catch (err) {
        if (err instanceof OutputValidationError) {
          failure = { status: AnalysisStatus.VALIDATION_FAILED, code: 'OUTPUT_INVALID', detail: err.message };
        } else if (err instanceof LlmProviderError) {
          failure = { status: AnalysisStatus.GROQ_ERROR, code: err.code, detail: err.message };
        } else {
          throw err;
        }
      }

      const flags: SafetyFlag[] = [...(prompt.inputFlags as SafetyFlag[]), ...(validated?.flags ?? [])];
      const common = {
        clinicalCaseId: caseId,
        modelName: response?.model ?? 'unavailable',
        promptVersion: prompt.version,
        promptHash: prompt.templateHash,
        isMock: response?.isMock ?? false,
        rawTokenUsage: response ? ({ ...response.tokenUsage } as Prisma.InputJsonValue) : Prisma.JsonNull,
        latencyMs: response?.latencyMs ?? null,
        safetyFlags: flags as unknown as Prisma.InputJsonValue,
      };

      if (failure || !validated) {
        const f = failure ?? { status: AnalysisStatus.GROQ_ERROR, code: 'UNKNOWN', detail: 'no result' };
        const [analysis] = await this.prisma.$transaction([
          this.prisma.clinicalAnalysis.create({
            data: { ...common, status: f.status, errorCode: f.code, responseJson: Prisma.JsonNull },
          }),
          this.prisma.clinicalCase.update({ where: { id: caseId }, data: { status: CaseStatus.FAILED } }),
        ]);
        this.logger.error(`Analysis failed caseId=${caseId} analysisId=${analysis.id} code=${f.code}: ${f.detail}`);
        await this.auditService.log({
          actorUserId: user.userId,
          organizationId: clinicalCase.organizationId,
          action: 'analysis.failed',
          resourceType: 'ClinicalAnalysis',
          resourceId: analysis.id,
          metadata: { caseId, status: f.status, errorCode: f.code },
        });
        throw new BadGatewayException({
          code: 'ANALYSIS_FAILED',
          message: 'The clinical analysis could not be completed. No result was produced. You can retry.',
          details: { analysisId: analysis.id, errorCode: f.code },
        });
      }

      const [analysis] = await this.prisma.$transaction([
        this.prisma.clinicalAnalysis.create({
          data: { ...common, status: AnalysisStatus.SUCCESS, responseJson: validated.data as unknown as Prisma.InputJsonValue },
        }),
        this.prisma.clinicalCase.update({ where: { id: caseId }, data: { status: CaseStatus.COMPLETED } }),
      ]);

      await this.auditService.log({
        actorUserId: user.userId,
        organizationId: clinicalCase.organizationId,
        action: 'analysis.complete',
        resourceType: 'ClinicalAnalysis',
        resourceId: analysis.id,
        metadata: { caseId, modelName: analysis.modelName, promptVersion: prompt.version, isMock: analysis.isMock, latencyMs: analysis.latencyMs },
      });

      return serializeAnalysis(analysis);
    } finally {
      // Never leave a case stuck in ANALYZING (e.g. after an unexpected database error).
      await this.prisma.clinicalCase.updateMany({
        where: { id: caseId, status: CaseStatus.ANALYZING },
        data: { status: CaseStatus.FAILED },
      });
    }
  }

  /** Atomically moves the case into ANALYZING; rejects concurrent duplicate runs. */
  private async acquireLock(caseId: string) {
    const claimed = await this.prisma.clinicalCase.updateMany({
      where: {
        id: caseId,
        OR: [{ status: { not: CaseStatus.ANALYZING } }, { updatedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } }],
      },
      data: { status: CaseStatus.ANALYZING },
    });
    if (claimed.count !== 1) {
      throw new ConflictException({ code: 'ANALYSIS_IN_PROGRESS', message: 'An analysis for this case is already running.' });
    }
  }

  async submitFeedback(user: AuthUser, analysisId: string, dto: DoctorFeedbackDto) {
    const analysis = await this.prisma.clinicalAnalysis.findUnique({
      where: { id: analysisId },
      include: { clinicalCase: { select: { id: true, doctorId: true, organizationId: true } } },
    });
    if (!analysis || !this.caseAccess.isAllowed(user, analysis.clinicalCase, 'act')) {
      throw new NotFoundException('Clinical analysis record not found');
    }
    if (analysis.status !== AnalysisStatus.SUCCESS) {
      throw new UnprocessableEntityException('Feedback can only be given on a completed analysis.');
    }

    const feedback = await this.prisma.doctorFeedback.create({
      data: { clinicalAnalysisId: analysisId, doctorId: user.userId, rating: dto.rating, comment: dto.comment?.trim() || null },
    });
    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: analysis.clinicalCase.organizationId,
      action: 'analysis.feedback',
      resourceType: 'DoctorFeedback',
      resourceId: feedback.id,
      metadata: { analysisId, rating: dto.rating },
    });
    return feedback;
  }
}

export function serializeAnalysis(a: {
  id: string;
  clinicalCaseId: string;
  status: AnalysisStatus;
  modelName: string;
  promptVersion: string;
  promptHash: string | null;
  isMock: boolean;
  latencyMs: number | null;
  errorCode: string | null;
  safetyFlags: Prisma.JsonValue;
  responseJson: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    id: a.id,
    caseId: a.clinicalCaseId,
    status: a.status,
    modelName: a.modelName,
    promptVersion: a.promptVersion,
    promptHash: a.promptHash,
    isMock: a.isMock,
    latencyMs: a.latencyMs,
    errorCode: a.errorCode,
    safetyFlags: Array.isArray(a.safetyFlags) ? a.safetyFlags : [],
    // A non-successful analysis never exposes a result, even for legacy rows.
    result: a.status === AnalysisStatus.SUCCESS ? a.responseJson : null,
    createdAt: a.createdAt,
  };
}
