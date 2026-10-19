import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

class RegistrationQueryDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

class DoctorStatusDto {
  @IsIn(['Active', 'Suspended'])
  status!: 'Active' | 'Suspended';
}

class RoleDto {
  @IsEnum(Role)
  role!: Role;
}

class AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number = 30;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  getDashboardStats(@CurrentUser() admin: AuthUser) {
    return this.adminService.getDashboardStats(admin);
  }

  @Get('system-health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('ai-models')
  getAiModelMonitoring(@CurrentUser() admin: AuthUser) {
    return this.adminService.getAiModelMonitoring(admin);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser() admin: AuthUser, @Query() query: AnalyticsQueryDto) {
    return this.adminService.getAnalytics(admin, query.days);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Get('pending-registrations-count')
  getPendingRegistrationsCount(@CurrentUser() admin: AuthUser) {
    return this.adminService.getPendingRegistrationsCount(admin);
  }

  @Get('registration-requests')
  getRegistrationRequests(@CurrentUser() admin: AuthUser, @Query() query: RegistrationQueryDto) {
    return this.adminService.getRegistrationRequests(admin, query.status);
  }

  @Patch('registration-requests/:id/approve')
  approve(@Param('id', ParseUUIDPipe) userId: string, @CurrentUser() admin: AuthUser) {
    return this.adminService.decideRegistration(admin, userId, 'approve');
  }

  @Patch('registration-requests/:id/reject')
  reject(@Param('id', ParseUUIDPipe) userId: string, @CurrentUser() admin: AuthUser) {
    return this.adminService.decideRegistration(admin, userId, 'reject');
  }

  @Get('doctors')
  getDoctors(@CurrentUser() admin: AuthUser) {
    return this.adminService.getDoctors(admin);
  }

  @Patch('doctors/:id/status')
  updateDoctorStatus(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: DoctorStatusDto, @CurrentUser() admin: AuthUser) {
    return this.adminService.updateDoctorStatus(admin, doctorId, dto.status);
  }

  @Post('users/:id/password-reset')
  issuePasswordReset(@Param('id', ParseUUIDPipe) userId: string, @CurrentUser() admin: AuthUser) {
    return this.adminService.issuePasswordReset(admin, userId);
  }

  @Patch('users/:id/role')
  @Roles(Role.SUPER_ADMIN)
  setRole(@Param('id', ParseUUIDPipe) userId: string, @Body() dto: RoleDto, @CurrentUser() admin: AuthUser) {
    return this.adminService.setUserRole(admin, userId, dto.role);
  }

  @Get('queries')
  getQueries(@CurrentUser() admin: AuthUser, @Query() query: PaginationQueryDto) {
    return this.adminService.getQueries(admin, query);
  }
}
