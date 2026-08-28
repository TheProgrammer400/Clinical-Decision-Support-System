import { Module } from '@nestjs/common';
import { AppConfigModule } from './modules/config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ClinicalCasesModule } from './modules/clinical-cases/clinical-cases.module';
import { ClinicalAnalysisModule } from './modules/clinical-analysis/clinical-analysis.module';
import { LlmModule } from './modules/llm/llm.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { SafetyModule } from './modules/safety/safety.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { MriModule } from './modules/mri/mri.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditController } from './modules/audit/audit.controller';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ClinicalCasesModule,
    ClinicalAnalysisModule,
    LlmModule,
    PromptsModule,
    SafetyModule,
    HealthModule,
    MriModule,
    AdminModule,
  ],
  controllers: [AuditController],
})
export class AppModule {}
