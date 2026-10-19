import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PoliciesModule } from './common/policies/policies.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicalAnalysisModule } from './modules/clinical-analysis/clinical-analysis.module';
import { ClinicalCasesModule } from './modules/clinical-cases/clinical-cases.module';
import { AppConfigModule } from './modules/config/config.module';
import { HealthModule } from './modules/health/health.module';
import { MriModule } from './modules/mri/mri.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    // Default per-IP budget for all routes; sensitive routes set stricter limits with @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      // Only the automated test suite may switch throttling off, and only per request at runtime.
      skipIf: () => process.env.NODE_ENV === 'test' && process.env.E2E_DISABLE_THROTTLE === 'true',
    }),
    DatabaseModule,
    PoliciesModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClinicalCasesModule,
    ClinicalAnalysisModule,
    HealthModule,
    MriModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
