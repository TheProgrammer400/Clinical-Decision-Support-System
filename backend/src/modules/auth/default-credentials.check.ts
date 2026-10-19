import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { verifyPassword } from './passwords';

/**
 * Earlier versions of this repository seeded these accounts with passwords published in the
 * source code, on every container start, including in production. If any of them still
 * uses its published password, force a password change on next sign-in.
 */
const PUBLISHED_SEED_CREDENTIALS: ReadonlyArray<[string, string]> = [
  ['admin@cdss.med', 'AdminPass123!'],
  ['doctor.smith@cdss.med', 'DoctorPass123!'],
];

@Injectable()
export class DefaultCredentialsCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultCredentialsCheck.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap() {
    for (const [email, published] of PUBLISHED_SEED_CREDENTIALS) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user || user.mustChangePassword) {
        continue;
      }
      if ((await verifyPassword(user.passwordHash, published)).valid) {
        await this.prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
        await this.audit.log({
          action: 'security.published_password_detected',
          resourceType: 'User',
          resourceId: user.id,
          organizationId: user.organizationId,
        });
        this.logger.warn(`Account ${email} still uses a published default password; a password change is now required.`);
      }
    }
  }
}
