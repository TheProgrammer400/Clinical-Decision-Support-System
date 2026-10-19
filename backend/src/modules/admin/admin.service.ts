import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AccountStatus, AnalysisStatus, MriStatus, Prisma, Role } from '@prisma/client';
import { promises as fs } from 'fs';
import { AuthUser } from '../../common/decorators/user.decorator';
import { paginationMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { canManageUser, manageableUsersWhere, readableCasesWhere } from '../../common/policies/case-access.policy';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AppConfigService } from '../config/config.service';
import { PromptsService } from '../prompts/prompts.service';

type ComponentStatus = 'healthy' | 'degraded' | 'down' | 'not_configured';

export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  latencyMs: number | null;
  detail?: string;
}

interface InferenceProbe extends ComponentHealth {
  device?: string | null;
  gpuName?: string | null;
  cudaAvailable?: boolean | null;
  modelVersion?: string | null;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
    private readonly prompts: PromptsService,
  ) {}

  // ------------------------------------------------------------------ dashboard

  async getDashboardStats(admin: AuthUser) {
    const caseScope = readableCasesWhere(admin);
    const userScope = manageableUsersWhere(admin);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

    const [totalDoctors, activeDoctors, totalCases, casesToday, casesThisMonth, failedCases, mriTotal, mriFailed, pending, recentAuditLogs, health] =
      await Promise.all([
        this.prisma.user.count({ where: { ...userScope, role: Role.DOCTOR, accountStatus: AccountStatus.APPROVED } }),
        this.prisma.user.count({ where: { ...userScope, role: Role.DOCTOR, accountStatus: AccountStatus.APPROVED, lastLoginAt: { gte: startOfMonth } } }),
        this.prisma.clinicalCase.count({ where: caseScope }),
        this.prisma.clinicalCase.count({ where: { ...caseScope, createdAt: { gte: startOfToday } } }),
        this.prisma.clinicalCase.count({ where: { ...caseScope, createdAt: { gte: startOfMonth } } }),
        this.prisma.clinicalCase.count({ where: { ...caseScope, status: 'FAILED' } }),
        this.prisma.mriAnalysis.count({ where: { clinicalCase: caseScope } }),
        this.prisma.mriAnalysis.count({ where: { clinicalCase: caseScope, status: MriStatus.FAILED } }),
        this.prisma.user.count({ where: { ...userScope, accountStatus: AccountStatus.PENDING } }),
        this.prisma.auditLog.findMany({
          where: this.auditScope(admin),
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { actorUser: { select: { id: true, email: true, fullName: true, role: true } } },
        }),
        this.getSystemHealth(),
      ]);

    const today = await this.analysisStats(admin, startOfToday);

    const activeAlerts: Array<{ id: string; severity: 'warning' | 'critical'; title: string; message: string }> = [];
    if (failedCases > 0) {
      activeAlerts.push({ id: 'failed_cases', severity: 'warning', title: 'Failed clinical analyses', message: `${failedCases} case(s) are in FAILED state.` });
    }
    if (mriFailed > 0) {
      activeAlerts.push({ id: 'failed_mri', severity: 'warning', title: 'MRI segmentation failures', message: `${mriFailed} MRI image(s) failed processing.` });
    }
    for (const c of health.components) {
      if (c.status === 'down' || c.status === 'degraded') {
        activeAlerts.push({ id: `health_${c.name}`, severity: c.status === 'down' ? 'critical' : 'warning', title: `${c.name}: ${c.status}`, message: c.detail ?? '' });
      }
    }
    if (health.auditWriteFailures > 0) {
      activeAlerts.push({ id: 'audit_failures', severity: 'critical', title: 'Audit log write failures', message: `${health.auditWriteFailures} audit event(s) could not be written since the server started.` });
    }

    return {
      generatedAt: new Date().toISOString(),
      scope: admin.role === Role.SUPER_ADMIN ? 'all_organizations' : 'organization',
      topStats: { totalDoctors, totalQueries: totalCases, mriAnalysesCount: mriTotal, activeAlertsCount: activeAlerts.length, pendingRegistrationsCount: pending },
      secondaryStats: {
        activeDoctorsThisMonth: activeDoctors,
        queriesToday: casesToday,
        queriesThisMonth: casesThisMonth,
        failedCases,
        mriFailures: mriFailed,
        analysesToday: today.total,
        analysesSucceededToday: today.succeeded,
        analysesFailedToday: today.failed,
        avgAnalysisLatencyMsToday: today.avgLatencyMs,
      },
      systemHealth: health,
      activeAlerts,
      recentAuditLogs,
    };
  }

  private auditScope(admin: AuthUser): Prisma.AuditLogWhereInput {
    return admin.role === Role.SUPER_ADMIN ? {} : { organizationId: admin.organizationId ?? '__none__' };
  }

  private async analysisStats(admin: AuthUser, since?: Date) {
    const where: Prisma.ClinicalAnalysisWhereInput = { clinicalCase: readableCasesWhere(admin), isMock: false };
    if (since) where.createdAt = { gte: since };
    const [grouped, latency] = await Promise.all([
      this.prisma.clinicalAnalysis.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.clinicalAnalysis.aggregate({ where: { ...where, status: AnalysisStatus.SUCCESS }, _avg: { latencyMs: true } }),
    ]);
    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    const succeeded = grouped.find((g) => g.status === AnalysisStatus.SUCCESS)?._count._all ?? 0;
    return {
      total,
      succeeded,
      failed: total - succeeded,
      avgLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
    };
  }

  // ------------------------------------------------------------------ health (measured)

  async getSystemHealth() {
    const [database, inference, storage] = await Promise.all([this.probeDatabase(), this.probeInference(), this.probeStorage()]);
    const llm: ComponentHealth = this.config.llmMock
      ? { name: 'LLM provider', status: 'degraded', latencyMs: null, detail: 'Development mock provider active (LLM_MOCK=true).' }
      : { name: 'LLM provider', status: 'healthy', latencyMs: null, detail: `Configured model ${this.config.groqModelName}. Not probed live to avoid cost; see failure rates.` };
    const audit = this.auditService.writeFailureStats;
    return {
      checkedAt: new Date().toISOString(),
      components: [database, inference, storage, llm],
      inference,
      auditWriteFailures: audit.failures,
      lastAuditFailureAt: audit.lastFailureAt,
    };
  }

  private async probeDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { name: 'Database', status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      return { name: 'Database', status: 'down', latencyMs: null, detail: 'Database query failed.' };
    }
  }

  private async probeInference(): Promise<InferenceProbe> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.mriInferenceServiceUrl}/health/ready`, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - start;
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        name: 'MRI inference service',
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs,
        detail: res.ok ? undefined : `Readiness check returned HTTP ${res.status}.`,
        device: typeof body.device === 'string' ? body.device : null,
        gpuName: typeof body.gpu_name === 'string' ? body.gpu_name : null,
        cudaAvailable: typeof body.cuda_available === 'boolean' ? body.cuda_available : null,
        modelVersion: typeof body.model_version === 'string' ? body.model_version : null,
      };
    } catch {
      return { name: 'MRI inference service', status: 'down', latencyMs: null, detail: 'Service did not respond within 3 s.' };
    }
  }

  private async probeStorage(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await fs.mkdir(this.config.artifactStorageDir, { recursive: true });
      await fs.access(this.config.artifactStorageDir, fs.constants?.W_OK ?? 2);
      return { name: 'Artifact storage (local disk)', status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      return { name: 'Artifact storage (local disk)', status: 'down', latencyMs: null, detail: 'Storage directory is not writable.' };
    }
  }

  // ------------------------------------------------------------------ AI monitoring (measured)

  async getAiModelMonitoring(admin: AuthUser) {
    const caseScope = readableCasesWhere(admin);
    const [all, mriGrouped, mriLatency, inference, models] = await Promise.all([
      this.analysisStats(admin),
      this.prisma.mriAnalysis.groupBy({ by: ['status'], where: { clinicalCase: caseScope }, _count: { _all: true } }),
      this.prisma.mriAnalysis.aggregate({ where: { clinicalCase: caseScope, status: MriStatus.COMPLETED }, _avg: { processingTimeMs: true } }),
      this.probeInference(),
      this.prisma.clinicalAnalysis.groupBy({
        by: ['modelName', 'promptVersion', 'status'],
        where: { clinicalCase: caseScope },
        _count: { _all: true },
      }),
    ]);
    const mri = (s: MriStatus) => mriGrouped.find((g) => g.status === s)?._count._all ?? 0;
    return {
      llm: {
        configuredModel: this.config.llmMock ? 'mock (LLM_MOCK=true)' : this.config.groqModelName,
        promptVersion: this.prompts.currentVersion,
        promptHash: this.prompts.templateHash,
        timeoutMs: this.config.groqRequestTimeoutMs,
        requestsTotal: all.total,
        successful: all.succeeded,
        failed: all.failed,
        avgLatencyMs: all.avgLatencyMs,
        byModelAndPrompt: models.map((m) => ({ modelName: m.modelName, promptVersion: m.promptVersion, status: m.status, count: m._count._all })),
      },
      mri: {
        health: inference,
        total: mriGrouped.reduce((s, g) => s + g._count._all, 0),
        completed: mri(MriStatus.COMPLETED),
        failed: mri(MriStatus.FAILED),
        processing: mri(MriStatus.PROCESSING),
        avgProcessingTimeMs: mriLatency._avg.processingTimeMs === null ? null : Math.round(mriLatency._avg.processingTimeMs),
      },
    };
  }

  // ------------------------------------------------------------------ analytics (measured)

  async getAnalytics(admin: AuthUser, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    since.setHours(0, 0, 0, 0);
    const caseScope = readableCasesWhere(admin);

    const [cases, withMri, analyses, feedback] = await Promise.all([
      this.prisma.clinicalCase.findMany({ where: { ...caseScope, createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.clinicalCase.count({ where: { ...caseScope, createdAt: { gte: since }, mriAnalyses: { some: {} } } }),
      this.analysisStats(admin, since),
      this.feedbackSummary(admin, since),
    ]);

    const perDay = new Map<string, number>();
    for (let d = 0; d <= days; d++) {
      perDay.set(new Date(since.getTime() + d * 86_400_000).toISOString().slice(0, 10), 0);
    }
    for (const c of cases) {
      const day = c.createdAt.toISOString().slice(0, 10);
      if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }

    return {
      days,
      since: since.toISOString(),
      totalCases: cases.length,
      casesWithMri: withMri,
      casesPerDay: [...perDay.entries()].map(([date, count]) => ({ date, count })),
      analyses,
      successRate: analyses.total > 0 ? analyses.succeeded / analyses.total : null,
      feedback,
    };
  }

  /** Doctor feedback grouped by model and prompt version (real analyses only). */
  private async feedbackSummary(admin: AuthUser, since: Date) {
    const rows = await this.prisma.doctorFeedback.findMany({
      where: { createdAt: { gte: since }, clinicalAnalysis: { isMock: false, clinicalCase: readableCasesWhere(admin) } },
      select: { rating: true, clinicalAnalysis: { select: { modelName: true, promptVersion: true } } },
    });
    const groups = new Map<string, { modelName: string; promptVersion: string; HELPFUL: number; PARTIALLY_HELPFUL: number; NOT_HELPFUL: number }>();
    for (const r of rows) {
      const k = `${r.clinicalAnalysis.modelName}\u0000${r.clinicalAnalysis.promptVersion}`;
      const g = groups.get(k) ?? { modelName: r.clinicalAnalysis.modelName, promptVersion: r.clinicalAnalysis.promptVersion, HELPFUL: 0, PARTIALLY_HELPFUL: 0, NOT_HELPFUL: 0 };
      g[r.rating] += 1;
      groups.set(k, g);
    }
    return [...groups.values()];
  }

  getSettings() {
    return {
      llm: { provider: this.config.llmMock ? 'mock' : 'groq', model: this.config.llmMock ? null : this.config.groqModelName, timeoutMs: this.config.groqRequestTimeoutMs },
      prompt: { version: this.prompts.currentVersion, hash: this.prompts.templateHash },
      uploads: { maxFileSizeMb: this.config.mriMaxUploadSizeMb, maxFilesPerRequest: this.config.mriMaxFiles, allowedFormats: ['PNG', 'JPEG', 'WebP'] },
      sessions: { accessTokenTtlSeconds: this.config.jwtAccessTtl, refreshTokenTtlSeconds: this.config.refreshTokenTtl },
      mfa: { available: this.config.mfaEncryptionKey !== null },
      artifactStorage: 'local filesystem',
    };
  }

  // ------------------------------------------------------------------ users

  async getPendingRegistrationsCount(admin: AuthUser) {
    return { count: await this.prisma.user.count({ where: { ...manageableUsersWhere(admin), accountStatus: AccountStatus.PENDING } }) };
  }

  async getRegistrationRequests(admin: AuthUser, status?: AccountStatus) {
    const users = await this.prisma.user.findMany({
      where: { ...manageableUsersWhere(admin), ...(status ? { accountStatus: status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, email: true, fullName: true, role: true, accountStatus: true, createdAt: true, organization: { select: { id: true, name: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.accountStatus,
      createdAt: u.createdAt,
      organizationName: u.organization?.name ?? null,
    }));
  }

  async decideRegistration(admin: AuthUser, userId: string, decision: 'approve' | 'reject') {
    const user = await this.getManageableUser(admin, userId);
    if (user.accountStatus !== AccountStatus.PENDING) {
      throw new BadRequestException(`Registration request is not pending (current status: ${user.accountStatus})`);
    }
    const accountStatus = decision === 'approve' ? AccountStatus.APPROVED : AccountStatus.REJECTED;
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { accountStatus } });
    await this.auditService.log({
      actorUserId: admin.userId,
      organizationId: user.organizationId,
      action: `admin.registration_${decision}`,
      resourceType: 'User',
      resourceId: userId,
    });
    return { id: updated.id, email: updated.email, fullName: updated.fullName, status: updated.accountStatus };
  }

  async getDoctors(admin: AuthUser) {
    const doctors = await this.prisma.user.findMany({
      where: { ...manageableUsersWhere(admin), role: Role.DOCTOR, accountStatus: { in: [AccountStatus.APPROVED, AccountStatus.SUSPENDED] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        email: true,
        fullName: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        mfaEnabled: true,
        organization: { select: { name: true } },
        _count: { select: { clinicalCases: true } },
      },
    });
    const mriCounts = await this.prisma.clinicalCase.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctors.map((d) => d.id) }, mriAnalyses: { some: {} } },
      _count: { _all: true },
    });
    const mriByDoctor = new Map(mriCounts.map((m) => [m.doctorId, m._count._all]));
    return doctors.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      email: d.email,
      status: d.accountStatus === AccountStatus.SUSPENDED ? 'Suspended' : 'Active',
      organizationName: d.organization?.name ?? null,
      mfaEnabled: d.mfaEnabled,
      createdAt: d.createdAt,
      lastLoginAt: d.lastLoginAt,
      queriesCount: d._count.clinicalCases,
      mriQueriesCount: mriByDoctor.get(d.id) ?? 0,
    }));
  }

  async updateDoctorStatus(admin: AuthUser, doctorId: string, status: 'Active' | 'Suspended') {
    const doctor = await this.getManageableUser(admin, doctorId);
    if (doctor.role !== Role.DOCTOR || (doctor.accountStatus !== AccountStatus.APPROVED && doctor.accountStatus !== AccountStatus.SUSPENDED)) {
      throw new NotFoundException('Doctor account not found');
    }

    let updated;
    if (status === 'Suspended') {
      // Suspension revokes every existing session immediately.
      updated = await this.authService.revokeAllSessions(doctorId, { accountStatus: AccountStatus.SUSPENDED });
    } else {
      // Reactivation does not touch the session generation, so revoked tokens stay revoked.
      updated = await this.prisma.user.update({ where: { id: doctorId }, data: { accountStatus: AccountStatus.APPROVED } });
    }
    await this.auditService.log({
      actorUserId: admin.userId,
      organizationId: doctor.organizationId,
      action: status === 'Suspended' ? 'admin.user_suspended' : 'admin.user_reactivated',
      resourceType: 'User',
      resourceId: doctorId,
    });
    return { id: updated.id, fullName: updated.fullName, email: updated.email, status };
  }

  async issuePasswordReset(admin: AuthUser, userId: string) {
    const user = await this.getManageableUser(admin, userId);
    if (user.id === admin.userId) {
      throw new BadRequestException('Use "change password" for your own account.');
    }
    const { token, expiresAt } = await this.authService.createPasswordResetToken(user.id, admin.userId);
    await this.auditService.log({
      actorUserId: admin.userId,
      organizationId: user.organizationId,
      action: 'admin.password_reset_issued',
      resourceType: 'User',
      resourceId: user.id,
    });
    // Returned once; it is not stored in plaintext. Deliver it to the user through a trusted channel.
    return { resetPath: `/reset-password?token=${token}`, expiresAt };
  }

  async setUserRole(admin: AuthUser, userId: string, role: Role) {
    if (admin.role !== Role.SUPER_ADMIN) {
      throw new NotFoundException('User not found');
    }
    if (userId === admin.userId) {
      throw new BadRequestException('You cannot change your own role.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (role === Role.ORG_ADMIN && !user.organizationId) {
      throw new BadRequestException('An organization administrator must belong to an organization.');
    }
    // Changing privileges ends existing sessions so the new role applies cleanly.
    const updated = await this.authService.revokeAllSessions(userId, { role });
    await this.auditService.log({
      actorUserId: admin.userId,
      organizationId: user.organizationId,
      action: 'admin.role_changed',
      resourceType: 'User',
      resourceId: userId,
      metadata: { from: user.role, to: role },
    });
    return { id: updated.id, role: updated.role };
  }

  private async getManageableUser(admin: AuthUser, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !canManageUser(admin, user)) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ------------------------------------------------------------------ queries

  async getQueries(admin: AuthUser, query: PaginationQueryDto) {
    const where = readableCasesWhere(admin);
    const [cases, total] = await Promise.all([
      this.prisma.clinicalCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          createdAt: true,
          status: true,
          doctor: { select: { id: true, fullName: true, email: true } },
          analyses: { take: 1, orderBy: { createdAt: 'desc' }, select: { status: true, modelName: true, latencyMs: true, isMock: true } },
          _count: { select: { mriAnalyses: true } },
        },
      }),
      this.prisma.clinicalCase.count({ where }),
    ]);
    // Case text is intentionally not included: operational views do not need clinical content.
    return {
      data: cases.map((c) => ({
        id: c.id,
        doctorName: c.doctor.fullName,
        doctorEmail: c.doctor.email,
        mriCount: c._count.mriAnalyses,
        status: c.status,
        createdAt: c.createdAt,
        analysisStatus: c.analyses[0]?.status ?? null,
        modelName: c.analyses[0]?.modelName ?? null,
        isMock: c.analyses[0]?.isMock ?? false,
        latencyMs: c.analyses[0]?.latencyMs ?? null,
      })),
      meta: paginationMeta(total, query.page, query.limit),
    };
  }
}
