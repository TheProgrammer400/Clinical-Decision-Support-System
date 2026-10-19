import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

const SENSITIVE_KEY = /(case_?text|response_?json|password|hash|token|secret|jwt|api_?key|cookie|authorization)/i;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private failures = 0;
  private lastFailureAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an audit event. A failed audit write does not abort the user's request, but it
   * is logged at error level and counted so it is visible on the admin system-health page.
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? null,
          organizationId: params.organizationId ?? null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: (sanitize(params.metadata) ?? {}) as Prisma.InputJsonValue,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (error) {
      this.failures += 1;
      this.lastFailureAt = new Date();
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AUDIT WRITE FAILED action=${params.action} resource=${params.resourceType}:${params.resourceId}: ${message}`);
    }
  }

  get writeFailureStats() {
    return { failures: this.failures, lastFailureAt: this.lastFailureAt };
  }
}

/** Recursively removes keys that may hold clinical text or credentials. */
export function sanitize(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      continue;
    }
    out[key] = v && typeof v === 'object' && !Array.isArray(v) ? sanitize(v as Record<string, unknown>) : v;
  }
  return out;
}
