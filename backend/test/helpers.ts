import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/modules/auth/passwords';
import { LLM_PROVIDER, LLMProvider, LlmProviderError, RawLLMResponse } from '../src/modules/llm/interfaces/llm-provider.interface';
import {
  MRI_INFERENCE_PROVIDER,
  MriInferenceError,
  MriInferenceProvider,
  MultiImageInferenceResponse,
  UploadFileParam,
} from '../src/modules/mri/interfaces/mri-inference-provider.interface';

export const PASSWORD = 'correct-horse-battery-staple';
export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Scripted LLM: each call consumes the next queued response or error. */
export class FakeLlm implements LLMProvider {
  queue: Array<string | Error> = [];
  calls = 0;

  async generateClinicalAnalysis(): Promise<RawLLMResponse> {
    this.calls += 1;
    const next = this.queue.shift() ?? validAnalysisJson();
    if (next instanceof Error) throw next;
    return { content: next, model: 'fake-model-1', tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, latencyMs: 5, isMock: false };
  }
}

/** Scripted MRI inference service. */
export class FakeInference implements MriInferenceProvider {
  mode: 'ok' | 'zero' | 'down' | 'invalid-image' = 'ok';
  received: UploadFileParam[] = [];

  async analyzeImages(files: UploadFileParam[]): Promise<MultiImageInferenceResponse> {
    this.received = files;
    if (this.mode === 'down') throw new MriInferenceError('connection refused');
    const png = `data:image/png;base64,${PNG_1PX.toString('base64')}`;
    // Results deliberately returned in reverse order: matching must not rely on position.
    const data = [...files].reverse().map((f) =>
      this.mode === 'invalid-image'
        ? { image_name: f.filename, status: 'failed' as const, model_version: 'test', processing_time_ms: 1, error_message: 'Image is too small' }
        : {
            image_name: f.filename,
            status: 'completed' as const,
            findings:
              this.mode === 'zero'
                ? { segmented_pixels: 0, foreground_pixels: 900, area_percent: 0, sqrt_area_percent: 0, analysis_resolution: 128 }
                : { segmented_pixels: 40, foreground_pixels: 800, area_percent: 5, sqrt_area_percent: 22.4, analysis_resolution: 128 },
            visualizations: { segmented_mask: png, tumor_overlay: png },
            model_version: 'test',
            processing_time_ms: 3,
          },
    );
    return { data, total_images: data.length, model_version: 'test' };
  }
}

export function validAnalysisJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    case_summary: 'Summary of the presented case.',
    key_clinical_findings: ['Headache'],
    missing_information: ['Vital signs'],
    differential_diagnoses: [{ diagnosis: 'Tension headache', likelihood: 'moderate', supporting_evidence: ['x'], contradicting_evidence: [] }],
    alert: { severity: 'low', title: 'LOW', summary: 'none', items: [] },
    red_flags: [],
    recommended_investigations: ['Neurological exam'],
    clinical_reasoning: 'Reasoning.',
    uncertainty_notes: 'Limited information.',
    ...overrides,
  });
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaClient;
  llm: FakeLlm;
  inference: FakeInference;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  assertDisposableDatabase();
  const llm = new FakeLlm();
  const inference = new FakeInference();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LLM_PROVIDER)
    .useValue(llm)
    .overrideProvider(MRI_INFERENCE_PROVIDER)
    .useValue(inference)
    .compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  const prisma = new PrismaClient();
  return { app, prisma, llm, inference, http: () => request(app.getHttpServer()) };
}

export async function closeTestApp(ctx: TestContext) {
  await ctx.prisma.$disconnect();
  await ctx.app.close();
}

function assertDisposableDatabase() {
  const name = new URL(process.env.DATABASE_URL ?? '').pathname.replace('/', '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run e2e tests against database "${name}": its name must end with _test.`);
  }
}

/** Empties every table. TRUNCATE is used because the audit-log trigger blocks row DELETEs. */
export async function resetDatabase(prisma: PrismaClient) {
  assertDisposableDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE doctor_feedbacks, clinical_analyses, mri_analyses, clinical_cases, refresh_tokens, password_reset_tokens, audit_logs, users, organizations CASCADE',
  );
}

export async function createOrg(prisma: PrismaClient, name = 'Org') {
  return prisma.organization.create({ data: { name } });
}

export async function createUser(
  prisma: PrismaClient,
  opts: { email: string; role?: Role; organizationId?: string | null; status?: AccountStatus; passwordHash?: string; mustChangePassword?: boolean },
) {
  return prisma.user.create({
    data: {
      email: opts.email.toLowerCase(),
      fullName: opts.email.split('@')[0],
      role: opts.role ?? Role.DOCTOR,
      organizationId: opts.organizationId ?? null,
      accountStatus: opts.status ?? AccountStatus.APPROVED,
      passwordHash: opts.passwordHash ?? (await hashPassword(PASSWORD)),
      mustChangePassword: opts.mustChangePassword ?? false,
    },
  });
}

export interface Session {
  token: string;
  cookie: string;
  auth: { Authorization: string };
}

export async function login(ctx: TestContext, email: string, password = PASSWORD): Promise<Session> {
  const res = await ctx.http().post('/api/v1/auth/login').send({ email, password }).expect(200);
  return sessionFrom(res);
}

export function sessionFrom(res: request.Response): Session {
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = setCookie.find((c) => c.startsWith('refresh_token='))?.split(';')[0] ?? '';
  return { token: res.body.accessToken, cookie, auth: { Authorization: `Bearer ${res.body.accessToken}` } };
}

export const PATIENT_CONTEXT = { ageGroup: 'adult', sex: 'not_specified', acuity: 'acute', historyTags: [] };

export async function createCase(ctx: TestContext, session: Session, text = 'Patient presents with severe headache for 3 days.') {
  const res = await ctx.http().post('/api/v1/clinical-cases').set(session.auth).send({ caseText: text, patientContext: PATIENT_CONTEXT }).expect(201);
  return res.body.id as string;
}

export { LlmProviderError };
