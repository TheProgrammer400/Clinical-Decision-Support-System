import { AccountStatus, Role } from '@prisma/client';
import { closeTestApp, createCase, createOrg, createTestApp, createUser, login, resetDatabase, Session, TestContext } from './helpers';

const API = '/api/v1';

describe('Administration, tenancy and audit (e2e)', () => {
  let ctx: TestContext;
  let orgA: string;
  let orgB: string;
  let adminA: Session;
  let superAdmin: Session;
  let docA: Session;
  let docB: Session;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => closeTestApp(ctx));

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    orgA = (await createOrg(ctx.prisma, 'A')).id;
    orgB = (await createOrg(ctx.prisma, 'B')).id;
    await createUser(ctx.prisma, { email: 'admina@x.test', role: Role.ORG_ADMIN, organizationId: orgA });
    await createUser(ctx.prisma, { email: 'super@x.test', role: Role.SUPER_ADMIN });
    await createUser(ctx.prisma, { email: 'a1@x.test', organizationId: orgA });
    await createUser(ctx.prisma, { email: 'b1@x.test', organizationId: orgB });
    [adminA, superAdmin, docA, docB] = await Promise.all(['admina', 'super', 'a1', 'b1'].map((n) => login(ctx, `${n}@x.test`)));
  });

  it('denies admin endpoints to doctors', async () => {
    for (const path of ['dashboard-stats', 'doctors', 'audit-logs', 'queries', 'analytics', 'settings']) {
      await ctx.http().get(`${API}/admin/${path}`).set(docA.auth).expect(403);
    }
  });

  it('scopes registration requests and approvals to the admin organization', async () => {
    const pendingA = await createUser(ctx.prisma, { email: 'pa@x.test', organizationId: orgA, status: AccountStatus.PENDING });
    const pendingB = await createUser(ctx.prisma, { email: 'pb@x.test', organizationId: orgB, status: AccountStatus.PENDING });

    const list = await ctx.http().get(`${API}/admin/registration-requests?status=PENDING`).set(adminA.auth).expect(200);
    expect(list.body.map((u: { email: string }) => u.email)).toEqual(['pa@x.test']);
    const count = await ctx.http().get(`${API}/admin/pending-registrations-count`).set(adminA.auth).expect(200);
    expect(count.body.count).toBe(1);

    await ctx.http().patch(`${API}/admin/registration-requests/${pendingB.id}/approve`).set(adminA.auth).expect(404);
    await ctx.http().patch(`${API}/admin/registration-requests/${pendingA.id}/approve`).set(adminA.auth).expect(200);
    await ctx.http().patch(`${API}/admin/registration-requests/${pendingB.id}/approve`).set(superAdmin.auth).expect(200);
  });

  it('prevents org admins from suspending doctors in other organizations', async () => {
    const b = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'b1@x.test' } });
    await ctx.http().patch(`${API}/admin/doctors/${b.id}/status`).set(adminA.auth).send({ status: 'Suspended' }).expect(404);
    await ctx.http().get(`${API}/users/me`).set(docB.auth).expect(200);
    const doctors = await ctx.http().get(`${API}/admin/doctors`).set(adminA.auth).expect(200);
    expect(doctors.body.map((d: { email: string }) => d.email)).toEqual(['a1@x.test']);
  });

  it('only shows org admins audit events from their own organization', async () => {
    await createCase(ctx, docA);
    await createCase(ctx, docB);
    const res = await ctx.http().get(`${API}/admin/audit-logs?limit=100`).set(adminA.auth).expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const log of res.body.data) {
      expect(log.organizationId).toBe(orgA);
    }
    const all = await ctx.http().get(`${API}/admin/audit-logs?limit=100`).set(superAdmin.auth).expect(200);
    expect(all.body.data.some((l: { organizationId: string }) => l.organizationId === orgB)).toBe(true);
  });

  it('lets only super admins assign roles, and only with an organization for ORG_ADMIN', async () => {
    const a1 = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'a1@x.test' } });
    const orphan = await createUser(ctx.prisma, { email: 'orphan@x.test' });
    await ctx.http().patch(`${API}/admin/users/${a1.id}/role`).set(adminA.auth).send({ role: 'ORG_ADMIN' }).expect(403);
    await ctx.http().patch(`${API}/admin/users/${orphan.id}/role`).set(superAdmin.auth).send({ role: 'ORG_ADMIN' }).expect(400);
    await ctx.http().patch(`${API}/admin/users/${a1.id}/role`).set(superAdmin.auth).send({ role: 'ORG_ADMIN' }).expect(200);
    // The role change ends the user's existing sessions.
    await ctx.http().get(`${API}/users/me`).set(docA.auth).expect(401);
  });

  it('reports measured data only: no hardcoded telemetry, scoped counts', async () => {
    await createCase(ctx, docA);
    await createCase(ctx, docB);
    const res = await ctx.http().get(`${API}/admin/dashboard-stats`).set(adminA.auth).expect(200);
    expect(res.body.topStats.totalQueries).toBe(1);
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/GTX|gpuUtilizationPct|gpuMemoryPct/);
    // The inference service is not running in tests: it must be reported as down, not healthy.
    const inference = res.body.systemHealth.components.find((c: { name: string }) => c.name === 'MRI inference service');
    expect(inference.status).toBe('down');

    const queries = await ctx.http().get(`${API}/admin/queries`).set(adminA.auth).expect(200);
    expect(queries.body.data).toHaveLength(1);
    expect(queries.body.data[0]).not.toHaveProperty('caseTextSnippet');

    const analytics = await ctx.http().get(`${API}/admin/analytics?days=7`).set(adminA.auth).expect(200);
    expect(analytics.body.totalCases).toBe(1);
    expect(analytics.body.casesPerDay).toHaveLength(8);
    await ctx.http().get(`${API}/admin/analytics?days=1000`).set(adminA.auth).expect(400);
  });

  it('keeps the audit log append-only at the database level', async () => {
    await createCase(ctx, docA);
    await expect(ctx.prisma.auditLog.deleteMany({})).rejects.toThrow(/append-only/);
    await expect(ctx.prisma.auditLog.updateMany({ data: { action: 'tampered' } })).rejects.toThrow(/append-only/);
    expect(await ctx.prisma.auditLog.count({ where: { action: 'tampered' } })).toBe(0);
  });

  it('does not delete clinical history when a doctor account is deleted', async () => {
    await createCase(ctx, docA);
    await expect(ctx.prisma.user.delete({ where: { email: 'a1@x.test' } })).rejects.toThrow();
    expect(await ctx.prisma.clinicalCase.count()).toBe(1);
  });
});
