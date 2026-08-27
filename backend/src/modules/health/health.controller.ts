import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cdss-backend',
    };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'disconnected',
        error: e.message,
      });
    }
  }
}
