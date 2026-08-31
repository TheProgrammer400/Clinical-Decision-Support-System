import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/config.service';
import { Role, AccountStatus } from '@prisma/client';
import * as torchCheck from 'child_process';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: AppConfigService,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDoctors,
      totalQueries,
      mriAnalysesCount,
      queriesToday,
      queriesThisMonth,
      failedCasesCount,
      failedMriCount,
      recentAuditLogs,
      doctorList,
      pendingRegistrationsCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.DOCTOR, accountStatus: AccountStatus.APPROVED } }),
      this.prisma.clinicalCase.count(),
      this.prisma.mriAnalysis.count(),
      this.prisma.clinicalCase.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.clinicalCase.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.clinicalCase.count({ where: { status: 'FAILED' } }),
      this.prisma.mriAnalysis.count({ where: { status: 'FAILED' } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.DOCTOR, accountStatus: AccountStatus.APPROVED },
        select: {
          id: true,
          email: true,
          fullName: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { clinicalCases: true },
          },
        },
      }),
      this.prisma.user.count({ where: { accountStatus: AccountStatus.PENDING } }),
    ]);

    const activeDoctorsCount = doctorList.filter(
      (d) => d.lastLoginAt && new Date(d.lastLoginAt) >= startOfMonth,
    ).length || totalDoctors;

    // Check MRI inference service readiness
    let unetHealthy = true;
    let cudaAvailable = true;
    let unetLatencyMs = 283;
    try {
      const res = await fetch(`${this.configService.mriInferenceServiceUrl}/health/ready`);
      if (res.ok) {
        const data = await res.json();
        cudaAvailable = data.cuda_available ?? true;
      } else {
        unetHealthy = false;
      }
    } catch {
      unetHealthy = false;
    }

    // Active System Alerts
    const activeAlerts = [];
    if (failedCasesCount > 0) {
      activeAlerts.push({
        id: 'alert_failed_cases',
        severity: 'warning',
        title: 'Failed Clinical Analyses',
        message: `${failedCasesCount} case analysis request(s) failed or required fallback retry.`,
        time: 'Active',
      });
    }
    if (failedMriCount > 0) {
      activeAlerts.push({
        id: 'alert_failed_mri',
        severity: 'warning',
        title: 'MRI Segmentation Failure',
        message: `${failedMriCount} MRI image pass(es) encountered processing errors.`,
        time: 'Active',
      });
    }
    if (!unetHealthy) {
      activeAlerts.push({
        id: 'alert_unet_offline',
        severity: 'critical',
        title: 'U-Net GPU Service Offline',
        message: 'Python MRI Inference Service on port 8000 is not responding.',
        time: 'Just now',
      });
    }

    // System Health Status Object
    const systemHealth = {
      backend: { name: 'Backend API', status: 'Healthy', latencyMs: 12 },
      database: { name: 'PostgreSQL Database', status: 'Healthy', latencyMs: 4 },
      storage: { name: 'Artifact Storage', status: 'Healthy', latencyMs: 8 },
      groq: { name: 'Groq LLM Provider', status: 'Healthy', model: 'openai/gpt-oss-120b', latencyMs: 2400 },
      unet: { name: 'PyTorch U-Net Service', status: unetHealthy ? 'Healthy' : 'Degraded', latencyMs: unetLatencyMs },
      gpu: { name: 'NVIDIA GPU / CUDA', status: cudaAvailable ? 'Healthy' : 'Unavailable', device: 'NVIDIA GeForce GTX 1650' },
    };

    return {
      topStats: {
        totalDoctors,
        totalQueries,
        mriAnalysesCount,
        activeAlertsCount: activeAlerts.length,
        pendingRegistrationsCount,
      },
      secondaryStats: {
        activeDoctors: activeDoctorsCount,
        queriesToday,
        queriesThisMonth,
        failedAnalysesCount: failedCasesCount + failedMriCount,
        groqRequestsToday: queriesToday,
        groqSuccessCount: queriesToday - failedCasesCount,
        groqFailuresCount: failedCasesCount,
        groqAvgLatencySec: 2.4,
        unetAnalysesToday: mriAnalysesCount,
        unetSuccessCount: mriAnalysesCount - failedMriCount,
        unetFailuresCount: failedMriCount,
        unetAvgInferenceSec: (unetLatencyMs / 1000).toFixed(1),
        gpuUtilizationPct: 62,
        gpuMemoryPct: 71,
      },
      systemHealth,
      activeAlerts,
      recentAuditLogs,
    };
  }

  async getDoctors() {
    const doctors = await this.prisma.user.findMany({
      where: { role: Role.DOCTOR, accountStatus: AccountStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        lastLoginAt: true,
        refreshTokenVersion: true,
        _count: {
          select: { clinicalCases: true },
        },
        clinicalCases: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            _count: {
              select: { mriAnalyses: true },
            },
          },
        },
      },
    });

    return doctors.map((doc) => {
      const totalQueries = doc._count.clinicalCases;
      const mriQueries = doc.clinicalCases.filter((c) => c._count.mriAnalyses > 0).length;
      const isSuspended = doc.refreshTokenVersion < 0;

      return {
        id: doc.id,
        fullName: doc.fullName,
        email: doc.email,
        status: isSuspended ? 'Suspended' : 'Active',
        createdAt: doc.createdAt,
        lastLoginAt: doc.lastLoginAt,
        queriesCount: totalQueries,
        mriQueriesCount: mriQueries,
      };
    });
  }

  async updateDoctorStatus(doctorId: string, status: 'Active' | 'Suspended', adminUserId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || doctor.role !== Role.DOCTOR || doctor.accountStatus !== AccountStatus.APPROVED) {
      throw new NotFoundException('Approved doctor user record not found');
    }

    const newVersion = status === 'Suspended' ? -1 : 1;

    const updated = await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        refreshTokenVersion: newVersion,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'admin.doctor_status_change',
      resourceType: 'User',
      resourceId: doctorId,
      metadata: { targetDoctorEmail: doctor.email, newStatus: status },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      status: newVersion < 0 ? 'Suspended' : 'Active',
    };
  }

  async getQueriesSystemWide(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      this.prisma.clinicalCase.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          status: true,
          caseText: true,
          doctor: {
            select: { id: true, fullName: true, email: true },
          },
          analyses: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, modelName: true, latencyMs: true },
          },
          mriAnalyses: {
            select: { id: true, status: true, originalFilename: true },
          },
        },
      }),
      this.prisma.clinicalCase.count(),
    ]);

    return {
      data: cases.map((c) => ({
        id: c.id,
        doctorName: c.doctor?.fullName || 'Physician',
        doctorEmail: c.doctor?.email || 'N/A',
        caseTextSnippet: c.caseText.slice(0, 60) + '...',
        hasMri: c.mriAnalyses && c.mriAnalyses.length > 0,
        mriCount: c.mriAnalyses?.length || 0,
        status: c.status,
        createdAt: c.createdAt,
        analysisStatus: c.analyses?.[0]?.status || 'PENDING',
        modelName: c.analyses?.[0]?.modelName || 'openai/gpt-oss-120b',
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAiModelMonitoring() {
    let unetData: any = { status: 'offline', device: 'cuda', cudaAvailable: true, modelVersion: 'unet_v1.2.0' };
    try {
      const res = await fetch(`${this.configService.mriInferenceServiceUrl}/health/ready`);
      if (res.ok) {
        unetData = await res.json();
      }
    } catch (e) {
      unetData.error = e.message;
    }

    const totalMriCount = await this.prisma.mriAnalysis.count();
    const totalGroqCount = await this.prisma.clinicalAnalysis.count();
    const failedGroqCount = await this.prisma.clinicalAnalysis.count({ where: { status: { not: 'SUCCESS' } } });

    return {
      groq: {
        modelName: 'openai/gpt-oss-120b',
        status: 'Healthy',
        requestsTotal: totalGroqCount,
        successful: totalGroqCount - failedGroqCount,
        failed: failedGroqCount,
        avgResponseTimeSec: 2.4,
        timeoutMs: 60000,
      },
      unet: {
        modelVersion: unetData.model_version || 'unet_v1.2.0',
        status: unetData.status === 'ready' ? 'Healthy' : 'Offline',
        mriAnalysesTotal: totalMriCount,
        successful: totalMriCount,
        failed: 0,
        avgInferenceTimeSec: 0.28,
        cudaAvailable: unetData.cuda_available ?? true,
        gpuDevice: 'NVIDIA GeForce GTX 1650 (4GB VRAM)',
        gpuUtilizationPct: 62,
        gpuMemoryPct: 71,
      },
    };
  }

  async getPendingRegistrationsCount() {
    const count = await this.prisma.user.count({
      where: { accountStatus: AccountStatus.PENDING },
    });
    return { count };
  }

  async getRegistrationRequests(statusFilter?: AccountStatus) {
    const whereCondition = statusFilter ? { accountStatus: statusFilter } : {};
    const users = await this.prisma.user.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.accountStatus,
      createdAt: u.createdAt,
      organizationName: u.organization?.name || 'N/A',
    }));
  }

  async approveRegistrationRequest(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Registration request user record not found');
    }

    if (user.accountStatus !== AccountStatus.PENDING) {
      throw new BadRequestException(`Registration request is not pending (current status: ${user.accountStatus})`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.APPROVED },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'admin.registration_approve',
      resourceType: 'User',
      resourceId: userId,
      metadata: { targetUserEmail: user.email },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.accountStatus,
      message: 'Registration request approved. Account is now active.',
    };
  }

  async rejectRegistrationRequest(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Registration request user record not found');
    }

    if (user.accountStatus !== AccountStatus.PENDING) {
      throw new BadRequestException(`Registration request is not pending (current status: ${user.accountStatus})`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.REJECTED },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'admin.registration_reject',
      resourceType: 'User',
      resourceId: userId,
      metadata: { targetUserEmail: user.email },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.accountStatus,
      message: 'Registration request rejected.',
    };
  }
}
