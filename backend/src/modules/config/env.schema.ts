import { z } from 'zod';

/**
 * Secrets that have appeared in this repository's history or examples. They are public
 * knowledge and must never be accepted outside local development.
 */
const PUBLIC_DEV_SECRETS = new Set([
  'dev_access_secret_key',
  'dev_refresh_secret_key',
  'dev_jwt_access_secret_key_change_in_production_12345',
  'dev_jwt_refresh_secret_key_change_in_production_67890',
]);

const PLACEHOLDER_GROQ_KEYS = new Set(['gsk_your_groq_api_key_here', 'gsk_placeholder_production_key']);

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: positiveInt(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: positiveInt(900),
    // Lifetime of opaque refresh tokens. JWT_REFRESH_TTL is accepted for backward compatibility.
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive().optional(),
    JWT_REFRESH_TTL: z.coerce.number().int().positive().optional(),

    CORS_ORIGINS: z.string().optional(),
    COOKIE_SECURE: booleanString.optional(),
    // Number of reverse-proxy hops to trust for client IPs (rate limiting, audit IPs).
    TRUST_PROXY: z.coerce.number().int().min(0).optional(),

    LLM_MOCK: booleanString.default('false'),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL_NAME: z.string().min(1).default('openai/gpt-oss-120b'),
    GROQ_REQUEST_TIMEOUT_MS: positiveInt(60000),

    MRI_INFERENCE_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    MRI_INFERENCE_TOKEN: z.string().min(16).optional(),
    MRI_INFERENCE_TIMEOUT_MS: positiveInt(120000),
    MRI_MAX_UPLOAD_SIZE_MB: positiveInt(20),
    MRI_MAX_FILES: positiveInt(10),
    ARTIFACT_STORAGE_DIR: z.string().min(1).default('uploads/mri'),

    // 32 bytes, base64 encoded. Required to enrol users in TOTP MFA.
    MFA_ENCRYPTION_KEY: z.string().optional(),

    LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  })
  .superRefine((env, ctx) => {
    const isProd = env.NODE_ENV === 'production';

    if (env.NODE_ENV !== 'development' && PUBLIC_DEV_SECRETS.has(env.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET is a publicly known development value; generate a new random secret',
      });
    }

    if (env.LLM_MOCK && isProd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LLM_MOCK'],
        message: 'LLM_MOCK=true is not allowed when NODE_ENV=production',
      });
    }

    if (!env.LLM_MOCK) {
      const key = env.GROQ_API_KEY?.trim();
      if (!key || PLACEHOLDER_GROQ_KEYS.has(key) || key.startsWith('gsk_mock')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GROQ_API_KEY'],
          message: 'GROQ_API_KEY must be a real key (or set LLM_MOCK=true for local development/tests)',
        });
      }
    }

    if (env.MFA_ENCRYPTION_KEY && Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64').length !== 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MFA_ENCRYPTION_KEY'],
        message: 'MFA_ENCRYPTION_KEY must be 32 bytes encoded as base64',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Used by @nestjs/config: throws a readable error listing every invalid variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration. Refusing to start:\n${details}`);
  }
  return result.data;
}
