import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

// Disposable database only. Never point the e2e suite at a database holding real data:
// it truncates every table between test files.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://cdss_test:cdss_test@localhost:5432/cdss_test';
process.env.JWT_ACCESS_SECRET = 'e2e-test-secret-'.padEnd(64, 'x');
process.env.LLM_MOCK = 'true';
process.env.COOKIE_SECURE = 'false';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.MRI_MAX_UPLOAD_SIZE_MB = '1';
process.env.MRI_MAX_FILES = '3';
process.env.MRI_INFERENCE_SERVICE_URL = 'http://127.0.0.1:9';
process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.ARTIFACT_STORAGE_DIR = mkdtempSync(path.join(tmpdir(), 'cdss-e2e-'));
process.env.E2E_DISABLE_THROTTLE = 'true';
