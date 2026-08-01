const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  chat: {
    send: (businessId: string, message: string, conversationId?: string, channel?: string) =>
      fetchAPI('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ businessId, message, conversationId, channel }),
      }),
  },

  business: {
    getAll: (page = 1, limit = 10) =>
      fetchAPI(`/api/business?page=${page}&limit=${limit}`),
    getById: (id: string) =>
      fetchAPI(`/api/business/${id}`),
    create: (data: any) =>
      fetchAPI('/api/business', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchAPI(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateKnowledge: (id: string, knowledgeBase: any) =>
      fetchAPI(`/api/business/${id}/knowledge`, { method: 'PUT', body: JSON.stringify({ knowledgeBase }) }),
    updateRules: (id: string, rules: any) =>
      fetchAPI(`/api/business/${id}/rules`, { method: 'PUT', body: JSON.stringify({ rules }) }),
    delete: (id: string) =>
      fetchAPI(`/api/business/${id}`, { method: 'DELETE' }),
    getStats: (id: string) =>
      fetchAPI(`/api/business/${id}/stats`),
  },

  conversations: {
    getByBusiness: (businessId: string, page = 1, limit = 20) =>
      fetchAPI(`/api/conversations/${businessId}?page=${page}&limit=${limit}`),
    getById: (id: string) =>
      fetchAPI(`/api/conversations/detail/${id}`),
    close: (id: string) =>
      fetchAPI(`/api/conversations/${id}/close`, { method: 'PUT' }),
    transfer: (id: string) =>
      fetchAPI(`/api/conversations/${id}/transfer`, { method: 'PUT' }),
  },

  appointments: {
    getByBusiness: (businessId: string, page = 1, limit = 20) =>
      fetchAPI(`/api/appointments/${businessId}?page=${page}&limit=${limit}`),
    create: (data: any) =>
      fetchAPI('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      fetchAPI(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },
};
