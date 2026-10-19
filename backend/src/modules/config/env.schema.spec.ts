import { validateEnv } from './env.schema';

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db/x',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  GROQ_API_KEY: 'gsk_realistic_key_value',
};

describe('validateEnv', () => {
  it('accepts a complete production configuration', () => {
    const env = validateEnv(base);
    expect(env.LLM_MOCK).toBe(false);
    expect(env.PORT).toBe(4000);
  });

  it('refuses to start without a JWT secret (no insecure fallback)', () => {
    const { JWT_ACCESS_SECRET: _omitted, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it.each(['short', 'dev_jwt_access_secret_key_change_in_production_12345'])('rejects weak or published secret %s', (secret) => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: secret })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('forbids the mock LLM in production', () => {
    expect(() => validateEnv({ ...base, LLM_MOCK: 'true' })).toThrow(/LLM_MOCK/);
  });

  it.each([undefined, 'gsk_mock_key_for_dev_testing', 'gsk_placeholder_production_key', 'gsk_your_groq_api_key_here'])(
    'requires a real Groq key unless mock mode is explicit (%s)',
    (key) => {
      expect(() => validateEnv({ ...base, GROQ_API_KEY: key })).toThrow(/GROQ_API_KEY/);
      expect(() => validateEnv({ ...base, NODE_ENV: 'development', GROQ_API_KEY: key, LLM_MOCK: 'true' })).not.toThrow();
    },
  );

  it('treats empty values as unset (as written in .env.example)', () => {
    const env = validateEnv({ ...base, MRI_INFERENCE_TOKEN: '', MFA_ENCRYPTION_KEY: '', CORS_ORIGINS: '', TRUST_PROXY: '' });
    expect(env.MRI_INFERENCE_TOKEN).toBeUndefined();
    expect(env.MFA_ENCRYPTION_KEY).toBeUndefined();
  });

  it('validates the MFA key length', () => {
    expect(() => validateEnv({ ...base, MFA_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') })).toThrow(/MFA_ENCRYPTION_KEY/);
    expect(() => validateEnv({ ...base, MFA_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64') })).not.toThrow();
  });
});
