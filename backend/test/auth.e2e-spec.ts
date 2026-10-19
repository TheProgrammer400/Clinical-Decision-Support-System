import { AccountStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generate } from 'otplib';
import { DefaultCredentialsCheck } from '../src/modules/auth/default-credentials.check';
import { closeTestApp, createOrg, createTestApp, createUser, login, PASSWORD, resetDatabase, sessionFrom, TestContext } from './helpers';

const API = '/api/v1';

describe('Authentication & sessions (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => closeTestApp(ctx));
  beforeEach(() => resetDatabase(ctx.prisma));

  describe('registration', () => {
    it('returns the same response for new and existing emails (no account enumeration)', async () => {
      const body = { email: 'new@x.test', password: PASSWORD, confirmPassword: PASSWORD, fullName: 'New Doc' };
      const first = await ctx.http().post(`${API}/auth/register`).send(body).expect(202);
      const second = await ctx.http().post(`${API}/auth/register`).send(body).expect(202);
      expect(second.body).toEqual(first.body);
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'new@x.test' } });
      expect(user.accountStatus).toBe(AccountStatus.PENDING);
      expect(user.role).toBe(Role.DOCTOR);
      expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
    });

    it('rejects weak passwords and client-chosen roles', async () => {
      await ctx.http().post(`${API}/auth/register`).send({ email: 'a@x.test', password: 'short', confirmPassword: 'short', fullName: 'A' }).expect(400);
      await ctx
        .http()
        .post(`${API}/auth/register`)
        .send({ email: 'b@x.test', password: PASSWORD, confirmPassword: PASSWORD, fullName: 'B', role: 'SUPER_ADMIN' })
        .expect(400);
    });
  });

  describe('login', () => {
    it('uses one generic error for unknown users and wrong passwords', async () => {
      await createUser(ctx.prisma, { email: 'doc@x.test' });
      const unknown = await ctx.http().post(`${API}/auth/login`).send({ email: 'nobody@x.test', password: PASSWORD }).expect(401);
      const wrong = await ctx.http().post(`${API}/auth/login`).send({ email: 'doc@x.test', password: 'wrong-password' }).expect(401);
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('only reveals a pending status after the correct password', async () => {
      await createUser(ctx.prisma, { email: 'pending@x.test', status: AccountStatus.PENDING });
      const wrong = await ctx.http().post(`${API}/auth/login`).send({ email: 'pending@x.test', password: 'wrong-password' }).expect(401);
      expect(JSON.stringify(wrong.body)).not.toMatch(/pending/i);
      const right = await ctx.http().post(`${API}/auth/login`).send({ email: 'pending@x.test', password: PASSWORD }).expect(403);
      expect(right.body.code).toBe('ACCOUNT_PENDING');
    });

    it('locks the account after repeated failures, even for the correct password', async () => {
      await createUser(ctx.prisma, { email: 'lock@x.test' });
      for (let i = 0; i < 5; i++) {
        await ctx.http().post(`${API}/auth/login`).send({ email: 'lock@x.test', password: 'bad-password-x' }).expect(401);
      }
      await ctx.http().post(`${API}/auth/login`).send({ email: 'lock@x.test', password: PASSWORD }).expect(401);
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'lock@x.test' } });
      expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns the access token in the body and the refresh token only as an httpOnly cookie', async () => {
      await createUser(ctx.prisma, { email: 'doc@x.test' });
      const res = await ctx.http().post(`${API}/auth/login`).send({ email: 'doc@x.test', password: PASSWORD }).expect(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeUndefined();
      const cookie = ([] as string[]).concat(res.headers['set-cookie']).find((c) => c.startsWith('refresh_token='))!;
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    });

    it('transparently upgrades legacy bcrypt hashes', async () => {
      await createUser(ctx.prisma, { email: 'legacy@x.test', passwordHash: await bcrypt.hash(PASSWORD, 10) });
      await login(ctx, 'legacy@x.test');
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'legacy@x.test' } });
      expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
    });

    it('throttles repeated login attempts per client', async () => {
      process.env.E2E_DISABLE_THROTTLE = 'false';
      try {
        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
          statuses.push((await ctx.http().post(`${API}/auth/login`).send({ email: 'none@x.test', password: 'x-password' })).status);
        }
        expect(statuses).toContain(429);
      } finally {
        process.env.E2E_DISABLE_THROTTLE = 'true';
      }
    });
  });

  describe('refresh token rotation', () => {
    it('rotates on every use and revokes the whole family when an old token is replayed', async () => {
      await createUser(ctx.prisma, { email: 'doc@x.test' });
      const s1 = await login(ctx, 'doc@x.test');

      const r2 = await ctx.http().post(`${API}/auth/refresh`).set('Cookie', s1.cookie).expect(200);
      const s2 = sessionFrom(r2);
      expect(s2.cookie).not.toBe(s1.cookie);

      // Replay of the already-rotated token: treated as theft.
      await ctx.http().post(`${API}/auth/refresh`).set('Cookie', s1.cookie).expect(401);
      // The legitimate newer token and the current access token are now revoked too.
      await ctx.http().post(`${API}/auth/refresh`).set('Cookie', s2.cookie).expect(401);
      await ctx.http().get(`${API}/users/me`).set(s2.auth).expect(401);
    });

    it('rejects a missing cookie and does not accept a token in the body', async () => {
      await ctx.http().post(`${API}/auth/refresh`).expect(401);
      await ctx.http().post(`${API}/auth/refresh`).send({ refreshToken: 'abc' }).expect(401);
    });

    it('logout revokes access and refresh tokens', async () => {
      await createUser(ctx.prisma, { email: 'doc@x.test' });
      const s = await login(ctx, 'doc@x.test');
      await ctx.http().post(`${API}/auth/logout`).set(s.auth).expect(200);
      await ctx.http().get(`${API}/users/me`).set(s.auth).expect(401);
      await ctx.http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(401);
    });
  });

  describe('suspension', () => {
    it('blocks existing sessions, login and refresh; reactivation does not revive old tokens', async () => {
      const org = await createOrg(ctx.prisma);
      const doctor = await createUser(ctx.prisma, { email: 'doc@x.test', organizationId: org.id });
      await createUser(ctx.prisma, { email: 'admin@x.test', role: Role.ORG_ADMIN, organizationId: org.id });
      const docSession = await login(ctx, 'doc@x.test');
      const admin = await login(ctx, 'admin@x.test');

      await ctx.http().patch(`${API}/admin/doctors/${doctor.id}/status`).set(admin.auth).send({ status: 'Suspended' }).expect(200);

      await ctx.http().get(`${API}/users/me`).set(docSession.auth).expect(401);
      await ctx.http().post(`${API}/auth/refresh`).set('Cookie', docSession.cookie).expect(401);
      const blocked = await ctx.http().post(`${API}/auth/login`).send({ email: 'doc@x.test', password: PASSWORD }).expect(403);
      expect(blocked.body.code).toBe('ACCOUNT_INACTIVE');

      await ctx.http().patch(`${API}/admin/doctors/${doctor.id}/status`).set(admin.auth).send({ status: 'Active' }).expect(200);
      await ctx.http().get(`${API}/users/me`).set(docSession.auth).expect(401);
      const fresh = await login(ctx, 'doc@x.test');
      await ctx.http().get(`${API}/users/me`).set(fresh.auth).expect(200);
    });
  });

  describe('passwords', () => {
    it('change-password invalidates other sessions and issues a new one', async () => {
      await createUser(ctx.prisma, { email: 'doc@x.test' });
      const old = await login(ctx, 'doc@x.test');
      const res = await ctx
        .http()
        .post(`${API}/auth/change-password`)
        .set(old.auth)
        .send({ currentPassword: PASSWORD, newPassword: 'a-brand-new-password' })
        .expect(200);
      await ctx.http().get(`${API}/users/me`).set(old.auth).expect(401);
      await ctx.http().get(`${API}/users/me`).set(sessionFrom(res).auth).expect(200);
      await login(ctx, 'doc@x.test', 'a-brand-new-password');
    });

    it('forces a password change before any other action when required', async () => {
      await createUser(ctx.prisma, { email: 'temp@x.test', mustChangePassword: true });
      const s = await login(ctx, 'temp@x.test');
      const blocked = await ctx.http().get(`${API}/clinical-cases`).set(s.auth).expect(403);
      expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      await ctx.http().get(`${API}/users/me`).set(s.auth).expect(200);
      const changed = await ctx
        .http()
        .post(`${API}/auth/change-password`)
        .set(s.auth)
        .send({ currentPassword: PASSWORD, newPassword: 'another-new-password' })
        .expect(200);
      await ctx.http().get(`${API}/clinical-cases`).set(sessionFrom(changed).auth).expect(200);
    });

    it('admin-issued reset links are single-use, scoped and revoke sessions', async () => {
      const org = await createOrg(ctx.prisma, 'A');
      const other = await createOrg(ctx.prisma, 'B');
      const doctor = await createUser(ctx.prisma, { email: 'doc@x.test', organizationId: org.id });
      const outsider = await createUser(ctx.prisma, { email: 'out@x.test', organizationId: other.id });
      await createUser(ctx.prisma, { email: 'admin@x.test', role: Role.ORG_ADMIN, organizationId: org.id });
      const admin = await login(ctx, 'admin@x.test');
      const docSession = await login(ctx, 'doc@x.test');

      await ctx.http().post(`${API}/admin/users/${outsider.id}/password-reset`).set(admin.auth).expect(404);
      const issued = await ctx.http().post(`${API}/admin/users/${doctor.id}/password-reset`).set(admin.auth).expect(201);
      const token = new URL(issued.body.resetPath, 'http://x').searchParams.get('token')!;

      await ctx.http().post(`${API}/auth/password-reset/confirm`).send({ token, newPassword: 'reset-password-123' }).expect(200);
      await ctx.http().post(`${API}/auth/password-reset/confirm`).send({ token, newPassword: 'reset-password-456' }).expect(400);
      await ctx.http().get(`${API}/users/me`).set(docSession.auth).expect(401);
      await login(ctx, 'doc@x.test', 'reset-password-123');
    });
  });

  describe('MFA (TOTP)', () => {
    it('enrols, requires a code at login and rejects replayed codes', async () => {
      await createUser(ctx.prisma, { email: 'mfa@x.test' });
      const s = await login(ctx, 'mfa@x.test');
      const enrol = await ctx.http().post(`${API}/auth/mfa/enroll`).set(s.auth).expect(200);
      expect(enrol.body.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      const secret = enrol.body.secret as string;

      await ctx.http().post(`${API}/auth/mfa/confirm`).set(s.auth).send({ code: '000000' }).expect(400);
      const enrolCode = await generate({ secret });
      await ctx.http().post(`${API}/auth/mfa/confirm`).set(s.auth).send({ code: enrolCode }).expect(200);

      const step1 = await ctx.http().post(`${API}/auth/login`).send({ email: 'mfa@x.test', password: PASSWORD }).expect(200);
      expect(step1.body).toEqual({ mfaRequired: true, mfaToken: expect.any(String) });
      // The MFA step-up token is not an access token.
      await ctx.http().get(`${API}/users/me`).set('Authorization', `Bearer ${step1.body.mfaToken}`).expect(401);

      // The code used for enrolment cannot be replayed within its window.
      await ctx.http().post(`${API}/auth/mfa/login`).send({ mfaToken: step1.body.mfaToken, code: enrolCode }).expect(401);

      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'mfa@x.test' } });
      expect(stored.mfaSecretEnc).not.toContain(secret);
      // Simulate the next time window by rewinding the replay marker, then log in with a valid code.
      await ctx.prisma.user.update({ where: { id: stored.id }, data: { mfaLastUsedStep: stored.mfaLastUsedStep! - 2 } });
      const ok = await ctx.http().post(`${API}/auth/mfa/login`).send({ mfaToken: step1.body.mfaToken, code: await generate({ secret }) }).expect(200);
      await ctx.http().get(`${API}/users/me`).set(sessionFrom(ok).auth).expect(200);
    });
  });

  describe('published default credentials', () => {
    it('forces a password change for accounts still using the old seeded passwords', async () => {
      await createUser(ctx.prisma, { email: 'admin@cdss.med', role: Role.SUPER_ADMIN, passwordHash: await bcrypt.hash('AdminPass123!', 10) });
      await ctx.app.get(DefaultCredentialsCheck).onApplicationBootstrap();
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'admin@cdss.med' } });
      expect(user.mustChangePassword).toBe(true);
    });
  });
});
