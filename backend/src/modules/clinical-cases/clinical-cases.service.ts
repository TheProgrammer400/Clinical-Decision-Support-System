import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { CaseStatus, Role } from '@prisma/client';

@Injectable()
export class ClinicalCasesService {
  private readonly logger = new Logger(ClinicalCasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createCase(
    doctorId: string,
    organizationId: string | undefined,
    dto: CreateCaseDto,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.clinicalCase.findUnique({
        where: { idempotencyKey },
        include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (existing) {
        this.logger.log(`Idempotent case creation match for key=${idempotencyKey}`);
        return existing;
      }
    }

    const clinicalCase = await this.prisma.clinicalCase.create({
      data: {
        doctorId,
        organizationId,
        caseText: dto.caseText,
        patientContext: dto.patientContext || null,
        idempotencyKey: idempotencyKey || null,
        status: CaseStatus.PENDING,
      },
    });

    await this.auditService.log({
      actorUserId: doctorId,
      action: 'case.create',
      resourceType: 'ClinicalCase',
      resourceId: clinicalCase.id,
      metadata: { organizationId },
    });

    return clinicalCase;
  }

  async getCaseById(caseId: string, userId: string, role: string, userOrgId?: string) {
    const clinicalCase = await this.prisma.clinicalCase.findUnique({
      where: { id: caseId },
      include: {
        doctor: { select: { id: true, fullName: true, email: true } },
        analyses: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!clinicalCase) {
      throw new NotFoundException('Clinical case not found');
    }

    // Ownership / Org Access Guard
    if (role === Role.SUPER_ADMIN) {
      // Access granted
    } else if (role === Role.ORG_ADMIN) {
      if (userOrgId && clinicalCase.organizationId !== userOrgId) {
        throw new ForbiddenException('Access denied to clinical case outside organization');
      }
    } else {
      // Doctor role: must own case or belong to same org if shared
      if (clinicalCase.doctorId !== userId && clinicalCase.organizationId !== userOrgId) {
        throw new ForbiddenException('Access denied to clinical case');
      }
    }

    await this.auditService.log({
      actorUserId: userId,
      action: 'case.view',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
    });

    return clinicalCase;
  }

  async listCases(userId: string, role: string, userOrgId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (role === Role.SUPER_ADMIN) {
      whereClause = {};
    } else if (role === Role.ORG_ADMIN && userOrgId) {
      whereClause = { organizationId: userOrgId };
    } else {
      whereClause = { doctorId: userId };
    }

    const [cases, total] = await Promise.all([
      this.prisma.clinicalCase.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, createdAt: true, modelName: true },
          },
        },
      }),
      this.prisma.clinicalCase.count({ where: whereClause }),
    ]);

    return {
      data: cases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
