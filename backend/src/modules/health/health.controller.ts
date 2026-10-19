import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'cdss-backend' };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch (e) {
      this.logger.error(`Readiness check failed: ${e instanceof Error ? e.message : e}`);
      throw new ServiceUnavailableException({ code: 'NOT_READY', message: 'Database unavailable' });
    }
  }
}
