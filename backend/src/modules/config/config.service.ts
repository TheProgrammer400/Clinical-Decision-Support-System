import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as path from 'path';
import { Env } from './env.schema';

/**
 * Typed access to configuration that has already been validated by `validateEnv`.
 * There are deliberately no fallback secrets here: missing values fail at startup.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: NestConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get('PORT');
  }

  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get jwtAccessTtl(): number {
    return this.get('JWT_ACCESS_TTL');
  }

  get refreshTokenTtl(): number {
    return this.get('REFRESH_TOKEN_TTL') ?? this.get('JWT_REFRESH_TTL') ?? 1209600;
  }

  get corsOrigins(): string[] {
    const raw = this.get('CORS_ORIGINS');
    if (raw) {
      return raw.split(',').map((o) => o.trim()).filter(Boolean);
    }
    return this.isProduction ? [] : ['http://localhost:3000'];
  }

  get cookieSecure(): boolean {
    return this.get('COOKIE_SECURE') ?? this.isProduction;
  }

  get trustProxy(): number {
    return this.get('TRUST_PROXY') ?? (this.isProduction ? 1 : 0);
  }

  get llmMock(): boolean {
    return this.get('LLM_MOCK');
  }

  get groqApiKey(): string | undefined {
    return this.get('GROQ_API_KEY');
  }

  get groqModelName(): string {
    return this.get('GROQ_MODEL_NAME');
  }

  get groqRequestTimeoutMs(): number {
    return this.get('GROQ_REQUEST_TIMEOUT_MS');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get mriInferenceServiceUrl(): string {
    return this.get('MRI_INFERENCE_SERVICE_URL').replace(/\/$/, '');
  }

  get mriInferenceToken(): string | undefined {
    return this.get('MRI_INFERENCE_TOKEN');
  }

  get mriInferenceTimeoutMs(): number {
    return this.get('MRI_INFERENCE_TIMEOUT_MS');
  }

  get mriMaxUploadSizeMb(): number {
    return this.get('MRI_MAX_UPLOAD_SIZE_MB');
  }

  get mriMaxFiles(): number {
    return this.get('MRI_MAX_FILES');
  }

  get artifactStorageDir(): string {
    return path.resolve(process.cwd(), this.get('ARTIFACT_STORAGE_DIR'));
  }

  get mfaEncryptionKey(): Buffer | null {
    const raw = this.get('MFA_ENCRYPTION_KEY');
    return raw ? Buffer.from(raw, 'base64') : null;
  }
}
