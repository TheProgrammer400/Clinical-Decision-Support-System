import type {
  Analysis,
  CaseDetail,
  CaseStats,
  CaseSummary,
  FeedbackRating,
  MriAnalysis,
  Paginated,
  PatientContext,
  SessionUser,
} from './types';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** Normalised API error. `message` is always a displayable string. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// The access token lives only in memory (never localStorage), so injected scripts cannot
// read a long-lived credential. After a reload it is restored through the httpOnly
// refresh-token cookie.
let accessToken: string | null = null;
let refreshInFlight: Promise<SessionUser | null> | null = null;
const listeners = new Set<(user: SessionUser | null) => void>();

export function onSessionChange(listener: (user: SessionUser | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setSession(token: string | null, user: SessionUser | null) {
  accessToken = token;
  listeners.forEach((l) => l(user));
}

export function hasAccessToken() {
  return accessToken !== null;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { message?: unknown; code?: unknown; details?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    // Non-JSON error body.
  }
  const raw = body.message;
  const message = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : `Request failed (${res.status})`;
  return new ApiError(message, res.status, typeof body.code === 'string' ? body.code : 'ERROR', body.details as Record<string, unknown> | undefined);
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share one request:
 * refresh tokens are single-use and a parallel second use would be treated as token theft.
 */
export function refreshSession(): Promise<SessionUser | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        setSession(null, null);
        return null;
      }
      const data = (await res.json()) as { accessToken: string; user: SessionUser };
      setSession(data.accessToken, data.user);
      return data.user;
    } catch {
      setSession(null, null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the automatic refresh-and-retry on 401 (used by auth endpoints). */
  noRetry?: boolean;
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, noRetry, headers: extraHeaders, ...init } = options;
  const headers = new Headers(extraHeaders);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) {
    headers.set('Content-Type', 'application/json');
  }
  const send = () => {
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res = await send();
  if (res.status === 401 && !noRetry) {
    if (await refreshSession()) {
      res = await send();
    }
  }
  return res;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawRequest(path, options);
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export type LoginResult = { mfaRequired: true; mfaToken: string } | { mfaRequired: false; user: SessionUser };

async function establish(path: string, body: unknown): Promise<SessionUser> {
  const data = await request<{ accessToken: string; user: SessionUser }>(path, { method: 'POST', body, noRetry: true });
  setSession(data.accessToken, data.user);
  return data.user;
}

export const apiClient = {
  // ----- auth
  async login(email: string, password: string): Promise<LoginResult> {
    const data = await request<{ mfaRequired?: boolean; mfaToken?: string; accessToken?: string; user?: SessionUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      noRetry: true,
    });
    if (data.mfaRequired && data.mfaToken) {
      return { mfaRequired: true, mfaToken: data.mfaToken };
    }
    setSession(data.accessToken!, data.user!);
    return { mfaRequired: false, user: data.user! };
  },
  completeMfaLogin: (mfaToken: string, code: string) => establish('/auth/mfa/login', { mfaToken, code }),
  register: (data: { email: string; password: string; confirmPassword: string; fullName: string; organizationName?: string }) =>
    request<{ message: string }>('/auth/register', { method: 'POST', body: data, noRetry: true }),
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST', noRetry: true });
    } catch {
      // Already signed out server-side.
    } finally {
      setSession(null, null);
    }
  },
  getSession: () => request<SessionUser>('/auth/session'),
  changePassword: (currentPassword: string, newPassword: string) => establish('/auth/change-password', { currentPassword, newPassword }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword }, noRetry: true }),
  beginMfaEnrollment: () => request<{ secret: string; otpauthUri: string }>('/auth/mfa/enroll', { method: 'POST' }),
  confirmMfa: (code: string) => request<{ mfaEnabled: boolean }>('/auth/mfa/confirm', { method: 'POST', body: { code } }),
  disableMfa: (code: string) => request<{ mfaEnabled: boolean }>('/auth/mfa/disable', { method: 'POST', body: { code } }),

  // ----- cases
  createCase: (caseText: string, patientContext: PatientContext, idempotencyKey: string) =>
    request<{ id: string }>('/clinical-cases', { method: 'POST', body: { caseText, patientContext }, headers: { 'Idempotency-Key': idempotencyKey } }),
  getCase: (id: string) => request<CaseDetail>(`/clinical-cases/${encodeURIComponent(id)}`),
  listCases: (page = 1, limit = 20) => request<Paginated<CaseSummary>>(`/clinical-cases?page=${page}&limit=${limit}`),
  getCaseStats: () => request<CaseStats>('/clinical-cases/stats'),
  analyzeCase: (id: string) => request<Analysis>(`/clinical-cases/${encodeURIComponent(id)}/analyze`, { method: 'POST' }),
  exportCase: (id: string) => request<Record<string, unknown>>(`/clinical-cases/${encodeURIComponent(id)}/export`),
  submitFeedback: (analysisId: string, rating: FeedbackRating, comment?: string) =>
    request(`/clinical-analysis/${encodeURIComponent(analysisId)}/feedback`, { method: 'POST', body: { rating, comment: comment || undefined } }),

  // ----- MRI
  uploadMri(caseId: string, files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return request<MriAnalysis[]>(`/clinical-cases/${encodeURIComponent(caseId)}/mri`, { method: 'POST', body: form });
  },
  getCaseMriAnalyses: (caseId: string) => request<MriAnalysis[]>(`/clinical-cases/${encodeURIComponent(caseId)}/mri`),
  /** Fetches an artifact with the Authorization header; returns an object URL the caller must revoke. */
  async getArtifactObjectUrl(caseId: string, mriId: string, kind: 'original' | 'mask' | 'overlay'): Promise<string> {
    const res = await rawRequest(`/clinical-cases/${encodeURIComponent(caseId)}/mri/${encodeURIComponent(mriId)}/artifacts/${kind}`);
    if (!res.ok) throw await toApiError(res);
    return URL.createObjectURL(await res.blob());
  },

  // ----- generic admin access (typed at call sites)
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
};
