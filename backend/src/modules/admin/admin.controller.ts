import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Role, AccountStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('pending-registrations-count')
  async getPendingRegistrationsCount() {
    return this.adminService.getPendingRegistrationsCount();
  }

  @Get('registration-requests')
  async getRegistrationRequests(@Query('status') status?: AccountStatus) {
    return this.adminService.getRegistrationRequests(status);
  }

  @Patch('registration-requests/:id/approve')
  async approveRegistrationRequest(
    @Param('id') userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.adminService.approveRegistrationRequest(userId, adminUserId);
  }

  @Patch('registration-requests/:id/reject')
  async rejectRegistrationRequest(
    @Param('id') userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.adminService.rejectRegistrationRequest(userId, adminUserId);
  }

  @Get('doctors')
  async getDoctors() {
    return this.adminService.getDoctors();
  }

  @Patch('doctors/:id/status')
  async updateDoctorStatus(
    @Param('id') doctorId: string,
    @Body('status') status: 'Active' | 'Suspended',
    @CurrentUser('userId') adminUserId: string,
  ) {
    if (!status || (status !== 'Active' && status !== 'Suspended')) {
      throw new BadRequestException('Status must be "Active" or "Suspended"');
    }
    return this.adminService.updateDoctorStatus(doctorId, status, adminUserId);
  }

  @Get('queries')
  async getQueriesSystemWide(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getQueriesSystemWide(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('ai-models')
  async getAiModelMonitoring() {
    return this.adminService.getAiModelMonitoring();
  }

  @Get('system-health')
  async getSystemHealth() {
    const stats = await this.adminService.getDashboardStats();
    return stats.systemHealth;
  }
}
