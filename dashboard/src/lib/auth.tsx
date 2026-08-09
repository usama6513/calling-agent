'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-seven-chi-71.vercel.app';
const TOKEN_KEY = 'ca-access-token';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType>(null as any);

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      tokenRef.current = localStorage.getItem(TOKEN_KEY);
    }
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);
  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        // Try refresh token cookie
        const res = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.data.accessToken);
          setUser(data.data.user);
        }
        return;
      }
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
      } else if (res.status === 401) {
        // Access token expired — try refresh
        const r2 = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (r2.ok) {
          const data = await r2.json();
          setToken(data.data.accessToken);
          setUser(data.data.user);
        } else {
          setToken('');
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, setToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    setToken(data.data.accessToken);
    setUser(data.data.user);
  }, [setToken]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors on logout
    }
    setToken('');
    setUser(null);
  }, [setToken]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
