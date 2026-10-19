import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisStatus, CaseStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../../common/decorators/user.decorator';
import { paginationMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { readableCasesWhere } from '../../common/policies/case-access.policy';
import { CaseAccessService } from '../../common/policies/case-access.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { serializeAnalysis } from '../clinical-analysis/clinical-analysis.service';
import { serializeMri } from '../mri/mri.service';
import { ARTIFACT_STORAGE, ArtifactStorage } from '../mri/storage/artifact-storage';
import { CreateCaseDto } from './dto/create-case.dto';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const PREVIEW_LENGTH = 200;

type AlertSeverity = 'critical' | 'moderate' | 'low';

@Injectable()
export class ClinicalCasesService {
  private readonly logger = new Logger(ClinicalCasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly caseAccess: CaseAccessService,
    @Inject(ARTIFACT_STORAGE) private readonly storage: ArtifactStorage,
  ) {}

  async createCase(user: AuthUser, dto: CreateCaseDto, idempotencyKey?: string) {
    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be 8-128 characters of [A-Za-z0-9_-]');
    }

    if (idempotencyKey) {
      // Keys are scoped to the submitting doctor: another user's key never matches.
      const existing = await this.findByIdempotencyKey(user.userId, idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    let clinicalCase;
    try {
      clinicalCase = await this.prisma.clinicalCase.create({
        data: {
          doctorId: user.userId,
          organizationId: user.organizationId,
          caseText: dto.caseText.trim(),
          patientContext: dto.patientContext ? ({ ...dto.patientContext } as Prisma.InputJsonValue) : Prisma.JsonNull,
          idempotencyKey: idempotencyKey ?? null,
          status: CaseStatus.PENDING,
        },
      });
    } catch (err) {
      // A concurrent request with the same key won the race; return its case.
      if (idempotencyKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.findByIdempotencyKey(user.userId, idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }

    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: user.organizationId,
      action: 'case.create',
      resourceType: 'ClinicalCase',
      resourceId: clinicalCase.id,
    });
    return this.summarize(clinicalCase);
  }

  private async findByIdempotencyKey(doctorId: string, idempotencyKey: string) {
    const existing = await this.prisma.clinicalCase.findUnique({
      where: { doctorId_idempotencyKey: { doctorId, idempotencyKey } },
    });
    return existing ? this.summarize(existing) : null;
  }

  private summarize(c: { id: string; status: CaseStatus; createdAt: Date; updatedAt: Date }) {
    return { id: c.id, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt };
  }

  async getCaseById(user: AuthUser, caseId: string) {
    await this.caseAccess.getCaseOrThrow(user, caseId, 'read');
    const clinicalCase = await this.prisma.clinicalCase.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        doctor: { select: { id: true, fullName: true } },
        analyses: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { feedbacks: true } } } },
        mriAnalyses: { orderBy: { createdAt: 'asc' } },
      },
    });

    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: clinicalCase.organizationId,
      action: 'case.view',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
    });

    return {
      id: clinicalCase.id,
      status: clinicalCase.status,
      caseText: clinicalCase.caseText,
      patientContext: clinicalCase.patientContext,
      organizationId: clinicalCase.organizationId,
      doctor: clinicalCase.doctor,
      canAct: this.caseAccess.isAllowed(user, clinicalCase, 'act'),
      createdAt: clinicalCase.createdAt,
      updatedAt: clinicalCase.updatedAt,
      analyses: clinicalCase.analyses.map((a) => ({ ...serializeAnalysis(a), feedbackCount: a._count.feedbacks })),
      mriAnalyses: clinicalCase.mriAnalyses.map(serializeMri),
    };
  }

  async listCases(user: AuthUser, query: PaginationQueryDto) {
    const where = readableCasesWhere(user);
    const [cases, total] = await Promise.all([
      this.prisma.clinicalCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          status: true,
          caseText: true,
          createdAt: true,
          updatedAt: true,
          doctor: { select: { id: true, fullName: true } },
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, createdAt: true, modelName: true, isMock: true, responseJson: true },
          },
          _count: { select: { mriAnalyses: true } },
        },
      }),
      this.prisma.clinicalCase.count({ where }),
    ]);

    return {
      data: cases.map((c) => {
        const latest = c.analyses[0];
        return {
          id: c.id,
          status: c.status,
          caseTextPreview: c.caseText.length > PREVIEW_LENGTH ? `${c.caseText.slice(0, PREVIEW_LENGTH)}…` : c.caseText,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          doctor: c.doctor,
          mriCount: c._count.mriAnalyses,
          latestAnalysis: latest
            ? {
                id: latest.id,
                status: latest.status,
                createdAt: latest.createdAt,
                modelName: latest.modelName,
                isMock: latest.isMock,
                // Only the severity is exposed in lists; the full result needs the detail view.
                alertSeverity: latest.status === AnalysisStatus.SUCCESS ? extractSeverity(latest.responseJson) : null,
              }
            : null,
        };
      }),
      meta: paginationMeta(total, query.page, query.limit),
    };
  }

  /** Aggregate counts over every case the user may read (not just the current page). */
  async getStats(user: AuthUser) {
    const where = readableCasesWhere(user);
    const [byStatus, withMri, latestSeverities] = await Promise.all([
      this.prisma.clinicalCase.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.clinicalCase.count({ where: { ...where, mriAnalyses: { some: {} } } }),
      this.latestSeverityCounts(user),
    ]);
    const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<CaseStatus, number>>;
    const total = byStatus.reduce((sum, s) => sum + s._count._all, 0);
    return {
      total,
      pending: counts.PENDING ?? 0,
      analyzing: counts.ANALYZING ?? 0,
      completed: counts.COMPLETED ?? 0,
      failed: counts.FAILED ?? 0,
      withMri,
      latestAlertSeverity: latestSeverities,
    };
  }

  private async latestSeverityCounts(user: AuthUser): Promise<Record<AlertSeverity, number>> {
    const scope =
      user.role === Role.SUPER_ADMIN
        ? Prisma.sql`TRUE`
        : user.role === Role.ORG_ADMIN
          ? user.organizationId
            ? Prisma.sql`c.organization_id = ${user.organizationId}`
            : Prisma.sql`FALSE`
          : Prisma.sql`c.doctor_id = ${user.userId}`;

    const rows = await this.prisma.$queryRaw<Array<{ severity: string | null; n: bigint }>>`
      SELECT latest.response_json #>> '{alert,severity}' AS severity, COUNT(*) AS n
      FROM clinical_cases c
      JOIN LATERAL (
        SELECT a.response_json, a.status FROM clinical_analyses a
        WHERE a.clinical_case_id = c.id
        ORDER BY a.created_at DESC LIMIT 1
      ) latest ON latest.status = 'SUCCESS'
      WHERE ${scope}
      GROUP BY 1`;

    const result: Record<AlertSeverity, number> = { critical: 0, moderate: 0, low: 0 };
    for (const row of rows) {
      if (row.severity === 'critical' || row.severity === 'moderate' || row.severity === 'low') {
        result[row.severity] = Number(row.n);
      }
    }
    return result;
  }

  async exportCase(user: AuthUser, caseId: string) {
    const record = await this.getCaseById(user, caseId);
    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: record.organizationId,
      action: 'case.export',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
    });
    return {
      exportFormat: 'cdss-case-export',
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: user.userId,
      notice: 'Contains patient health information. Handle according to your organisation’s data protection policy.',
      case: record,
    };
  }

  /** Permanent deletion of a case, its analyses and images. Restricted to SUPER_ADMIN. */
  async deleteCase(user: AuthUser, caseId: string) {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super administrator can delete clinical records.');
    }
    const clinicalCase = await this.caseAccess.getCaseOrThrow(user, caseId, 'read');
    await this.prisma.clinicalCase.delete({ where: { id: caseId } });
    try {
      await this.storage.deleteCase(caseId);
    } catch (err) {
      this.logger.error(`Case ${caseId} deleted but artifact cleanup failed: ${err instanceof Error ? err.message : err}`);
    }
    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: clinicalCase.organizationId,
      action: 'case.delete',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
      metadata: { ownerDoctorId: clinicalCase.doctorId },
    });
    return { deleted: true, id: caseId };
  }
}

function extractSeverity(json: Prisma.JsonValue): AlertSeverity | null {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const alert = (json as Record<string, unknown>).alert as Record<string, unknown> | undefined;
    const severity = alert?.severity;
    if (severity === 'critical' || severity === 'moderate' || severity === 'low') {
      return severity;
    }
  }
  return null;
}
