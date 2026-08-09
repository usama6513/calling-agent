'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';
const TOKEN_KEY = 'ca-access-token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
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
    } else {
      redirectToLogin();
      throw new Error('Session expired. Please log in again.');
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

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    clearAuth();
    window.location.href = '/login';
  }
}

export const api = {
  chat: {
    send: (businessId: string, message: string, conversationId?: string, channel?: string, attachmentId?: string) =>
      authFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ businessId, message, conversationId, channel, attachmentId }),
      }),
    ensureConversation: (businessId: string, channel = 'web') =>
      authFetch('/api/chat/ensure-conversation', {
        method: 'POST',
        body: JSON.stringify({ businessId, channel }),
      }),
  },

  voice: {
    transcribe: (formData: FormData) =>
      fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      }).then((r) => r.json()),
    synthesize: (text: string, gender?: string) =>
      fetch(`${API_BASE}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, gender }),
      }).then((r) => r.blob()),
  },

  upload: (formData: FormData) =>
    authFetch('/api/upload', { method: 'POST', body: formData }),

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

  security: {
    getScans: (limit = 24) =>
      authFetch(`/api/security/scans?limit=${limit}`),
    getExercises: (limit = 20) =>
      authFetch(`/api/security/exercises?limit=${limit}`),
    runExercise: (side: 'both' | 'red' | 'blue' = 'both') =>
      authFetch('/api/security/exercise', { method: 'POST', body: JSON.stringify({ side }) }),
    getThreats: (limit = 50) =>
      authFetch(`/api/security/threats?limit=${limit}`),
    getBlocked: (limit = 100) =>
      authFetch(`/api/security/blocked?limit=${limit}`),
    unblock: (id: string) =>
      authFetch(`/api/security/blocked/${id}`, { method: 'DELETE' }),
  },

  banking: {
    getBusiness: () =>
      authFetch('/api/banking/business'),
    listAccounts: () =>
      authFetch('/api/banking/accounts'),
    createAccount: (data: any) =>
      authFetch('/api/banking/accounts', { method: 'POST', body: JSON.stringify(data) }),
    getAccount: (accountNumber: string) =>
      authFetch(`/api/banking/accounts/${accountNumber}`),
    getTransactions: (accountNumber: string, limit = 10) =>
      authFetch(`/api/banking/accounts/${accountNumber}/transactions?limit=${limit}`),
    deposit: (accountNumber: string, amount: number, description?: string) =>
      authFetch(`/api/banking/accounts/${accountNumber}/deposit`, { method: 'POST', body: JSON.stringify({ amount, description }) }),
    withdraw: (accountNumber: string, amount: number, description?: string) =>
      authFetch(`/api/banking/accounts/${accountNumber}/withdraw`, { method: 'POST', body: JSON.stringify({ amount, description }) }),
    transfer: (from: string, to: string, amount: number, note?: string) =>
      authFetch('/api/banking/transfer', { method: 'POST', body: JSON.stringify({ from, to, amount, note }) }),
  },
};
