import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('api-client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the access token in memory only', async () => {
    const { apiClient, hasAccessToken } = await import('./api-client');
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'tok', user: { id: 'u' } }));
    await apiClient.login('a@b.c', 'pw');
    expect(hasAccessToken()).toBe(true);
    expect(JSON.stringify({ ...localStorage })).not.toContain('tok');
  });

  it('uses a single refresh request for concurrent 401s and retries with the new token', async () => {
    const { apiClient } = await import('./api-client');
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        return json(200, { accessToken: 'new', user: { id: 'u' } });
      }
      const auth = new Headers(init.headers).get('Authorization');
      return auth === 'Bearer new' ? json(200, { ok: true }) : json(401, { message: 'expired' });
    });
    const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });

  it('turns validation error arrays into a readable message and keeps the code', async () => {
    const { apiClient, ApiError } = await import('./api-client');
    fetchMock.mockResolvedValue(json(400, { code: 'BAD_REQUEST', message: ['caseText too short', 'sex must be valid'] }));
    const err = await apiClient.get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).message).toBe('caseText too short sex must be valid');
    expect((err as InstanceType<typeof ApiError>).code).toBe('BAD_REQUEST');
  });

  it('returns the MFA step instead of a session when MFA is required', async () => {
    const { apiClient, hasAccessToken } = await import('./api-client');
    fetchMock.mockResolvedValueOnce(json(200, { mfaRequired: true, mfaToken: 'm.t.k' }));
    expect(await apiClient.login('a@b.c', 'pw')).toEqual({ mfaRequired: true, mfaToken: 'm.t.k' });
    expect(hasAccessToken()).toBe(false);
  });
});
