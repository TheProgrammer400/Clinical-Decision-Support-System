const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

let accessTokenMemory: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessTokenMemory = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('cdss_access_token', token);
    } else {
      localStorage.removeItem('cdss_access_token');
    }
  }
};

export const getAccessToken = (): string | null => {
  if (accessTokenMemory) return accessTokenMemory;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('cdss_access_token');
  }
  return null;
};

export const getArtifactUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}${url}`;
};

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  options.credentials = 'include';
  options.headers = headers;

  let response = await fetch(`${API_BASE_URL}${url}`, options);

  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    // Attempt automatic refresh
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.accessToken);
        
        // Retry original request with new token
        headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
        response = await fetch(`${API_BASE_URL}${url}`, options);
      } else {
        setAccessToken(null);
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register'
        ) {
          window.location.href = '/login';
        }
      }
    } catch (e) {
      setAccessToken(null);
    }
  }

  return response;
}

export const apiClient = {
  async register(data: any) {
    const res = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    const json = await res.json();
    if (json.accessToken) setAccessToken(json.accessToken);
    return json;
  },

  async login(credentials: any) {
    const res = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw await res.json();
    const json = await res.json();
    if (json.accessToken) setAccessToken(json.accessToken);
    return json;
  },

  async logout() {
    try {
      await fetchWithAuth('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getProfile() {
    const res = await fetchWithAuth('/users/me');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async createCase(caseText: string, patientContext?: any, idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const res = await fetchWithAuth('/clinical-cases', {
      method: 'POST',
      headers,
      body: JSON.stringify({ caseText, patientContext }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getCase(id: string) {
    const res = await fetchWithAuth(`/clinical-cases/${id}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async listCases(page = 1, limit = 20) {
    const res = await fetchWithAuth(`/clinical-cases?page=${page}&limit=${limit}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async analyzeCase(id: string) {
    const res = await fetchWithAuth(`/clinical-cases/${id}/analyze`, {
      method: 'POST',
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async submitFeedback(analysisId: string, rating: string, comment?: string) {
    const res = await fetchWithAuth(`/clinical-analysis/${analysisId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAuditLogs(page = 1, limit = 50) {
    const res = await fetchWithAuth(`/admin/audit-logs?page=${page}&limit=${limit}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAdminDashboardStats() {
    const res = await fetchWithAuth('/admin/dashboard-stats');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAdminDoctors() {
    const res = await fetchWithAuth('/admin/doctors');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async updateDoctorStatus(doctorId: string, status: 'Active' | 'Suspended') {
    const res = await fetchWithAuth(`/admin/doctors/${doctorId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAdminQueries(page = 1, limit = 20) {
    const res = await fetchWithAuth(`/admin/queries?page=${page}&limit=${limit}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAdminAiModels() {
    const res = await fetchWithAuth('/admin/ai-models');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getAdminSystemHealth() {
    const res = await fetchWithAuth('/admin/system-health');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getPendingRegistrationsCount() {
    const res = await fetchWithAuth('/admin/pending-registrations-count');
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getRegistrationRequests(status?: string) {
    const query = status ? `?status=${status}` : '';
    const res = await fetchWithAuth(`/admin/registration-requests${query}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async approveRegistrationRequest(id: string) {
    const res = await fetchWithAuth(`/admin/registration-requests/${id}/approve`, {
      method: 'PATCH',
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async rejectRegistrationRequest(id: string) {
    const res = await fetchWithAuth(`/admin/registration-requests/${id}/reject`, {
      method: 'PATCH',
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async uploadMri(caseId: string, files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const res = await fetchWithAuth(`/clinical-cases/${caseId}/mri`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getCaseMriAnalyses(caseId: string) {
    const res = await fetchWithAuth(`/clinical-cases/${caseId}/mri`);
    if (!res.ok) throw await res.json();
    return res.json();
  },
};
