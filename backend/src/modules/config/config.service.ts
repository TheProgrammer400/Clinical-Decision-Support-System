import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private nestConfigService: NestConfigService) {}

  get nodeEnv(): string {
    return this.nestConfigService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.nestConfigService.get<number>('PORT', 4000);
  }

  get databaseUrl(): string {
    return this.nestConfigService.get<string>('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.nestConfigService.get<string>('JWT_ACCESS_SECRET', 'dev_access_secret_key');
  }

  get jwtRefreshSecret(): string {
    return this.nestConfigService.get<string>('JWT_REFRESH_SECRET', 'dev_refresh_secret_key');
  }

  get jwtAccessTtl(): number {
    return Number(this.nestConfigService.get<number>('JWT_ACCESS_TTL', 900));
  }

  get jwtRefreshTtl(): number {
    return Number(this.nestConfigService.get<number>('JWT_REFRESH_TTL', 1209600));
  }

  get groqApiKey(): string {
    return this.nestConfigService.get<string>('GROQ_API_KEY', '');
  }

  get groqModelName(): string {
    return this.nestConfigService.get<string>('GROQ_MODEL_NAME', 'openai/gpt-oss-120b');
  }

  get groqRequestTimeoutMs(): number {
    return Number(this.nestConfigService.get<number>('GROQ_REQUEST_TIMEOUT_MS', 60000));
  }

  get promptVersion(): string {
    return this.nestConfigService.get<string>('PROMPT_VERSION', 'v1.4.0');
  }

  get logLevel(): string {
    return this.nestConfigService.get<string>('LOG_LEVEL', 'debug');
  }

  get sentryDsn(): string {
    return this.nestConfigService.get<string>('SENTRY_DSN', '');
  }

  get mriInferenceServiceUrl(): string {
    return this.nestConfigService.get<string>('MRI_INFERENCE_SERVICE_URL', 'http://localhost:8000');
  }

  get mriMaxUploadSizeMb(): number {
    return Number(this.nestConfigService.get<number>('MRI_MAX_UPLOAD_SIZE_MB', 20));
  }

  get mriS3Bucket(): string {
    return this.nestConfigService.get<string>('MRI_S3_BUCKET', 'cdss-mri-artifacts');
  }

  get modelArtifactsS3Bucket(): string {
    return this.nestConfigService.get<string>('MODEL_ARTIFACTS_S3_BUCKET', 'cdss-model-artifacts');
  }
}
