import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAuditLogs(
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') orgId: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('action') action?: string,
  ) {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const whereClause: any = {};
    if (action) {
      whereClause.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          actorUser: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
