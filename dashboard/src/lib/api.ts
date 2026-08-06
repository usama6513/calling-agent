'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';
const TOKEN_KEY = 'ca-access-token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.data.accessToken);
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  let token = getStoredToken();
  let response = await doFetch(token);

  // Access token expired → refresh and retry once
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      response = await doFetch(token);
    }
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const err = new Error(data?.error || 'Request failed');
    (err as any).status = response.status;
    throw err;
  }

  return data;
}

export function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export const api = {
  chat: {
    send: (businessId: string, message: string, conversationId?: string, channel?: string) =>
      authFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ businessId, message, conversationId, channel }),
      }),
  },

  business: {
    getAll: (page = 1, limit = 10) =>
      authFetch(`/api/business?page=${page}&limit=${limit}`),
    getById: (id: string) =>
      authFetch(`/api/business/${id}`),
    create: (data: any) =>
      authFetch('/api/business', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      authFetch(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateKnowledge: (id: string, knowledgeBase: any) =>
      authFetch(`/api/business/${id}/knowledge`, { method: 'PUT', body: JSON.stringify({ knowledgeBase }) }),
    updateRules: (id: string, rules: any) =>
      authFetch(`/api/business/${id}/rules`, { method: 'PUT', body: JSON.stringify({ rules }) }),
    delete: (id: string) =>
      authFetch(`/api/business/${id}`, { method: 'DELETE' }),
    getStats: (id: string) =>
      authFetch(`/api/business/${id}/stats`),
  },

  conversations: {
    getByBusiness: (businessId: string, page = 1, limit = 20) =>
      authFetch(`/api/conversations/${businessId}?page=${page}&limit=${limit}`),
    getById: (id: string) =>
      authFetch(`/api/conversations/detail/${id}`),
    close: (id: string) =>
      authFetch(`/api/conversations/${id}/close`, { method: 'PUT' }),
    transfer: (id: string) =>
      authFetch(`/api/conversations/${id}/transfer`, { method: 'PUT' }),
  },

  appointments: {
    getByBusiness: (businessId: string, page = 1, limit = 20) =>
      authFetch(`/api/appointments/${businessId}?page=${page}&limit=${limit}`),
    create: (data: any) =>
      authFetch('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      authFetch(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  models: {
    getAll: () =>
      authFetch('/api/groq/models'),
  },
};
