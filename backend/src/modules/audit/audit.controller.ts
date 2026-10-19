import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto, paginationMeta } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9_.]+$/)
  action?: string;
}

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAuditLogs(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) {
      where.action = query.action;
    }
    if (user.role !== Role.SUPER_ADMIN) {
      // Organization admins only see events attributed to their own organization.
      where.organizationId = user.organizationId ?? '__none__';
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { actorUser: { select: { id: true, email: true, fullName: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: paginationMeta(total, query.page, query.limit) };
  }
}
