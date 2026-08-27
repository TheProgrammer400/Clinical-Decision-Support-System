import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateAuditLogParams {
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an audit log entry to the database.
   * Strips any sensitive keys from metadata prior to persistence.
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: sanitizedMetadata || {},
          ipAddress: params.ipAddress || null,
        },
      });

      this.logger.log(`AUDIT: action=${params.action} actor=${params.actorUserId || 'system'} resource=${params.resourceType}:${params.resourceId}`);
    } catch (error) {
      this.logger.error(`Failed to write audit log entry: ${error.message}`, error.stack);
      // We do not throw here to prevent auditing issues from breaking core transactional flows if non-fatal
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const sanitized = { ...metadata };
    const sensitiveKeys = ['caseText', 'case_text', 'responseJson', 'response_json', 'password', 'passwordHash', 'token', 'jwt', 'apiKey'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        delete sanitized[key];
      }
    }
    return sanitized;
  }
}
