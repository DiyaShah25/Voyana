/**
 * Centralized API Client for Voyana
 * Provides robust HTTP client methods to connect the frontend domain services
 * to the shared MongoDB Atlas backend with token authorization, timeout,
 * and seamless fallback handling.
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.VITE_AI_SERVICE_URL as string) ||
  'http://localhost:3001';

const AUTH_STORAGE_KEY = 'voyana.auth_session';

export function getStoredAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.token || null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getStoredAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.message || json?.error || `Request failed with status ${res.status}`,
        data: json,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      status: 0,
      error: err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network error',
    };
  }
}
