const envBase =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_API_BASE) ||
  '';
export const API_BASE = (
  envBase ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
).replace(/\/$/, '');

function fullUrl(path: string) {
  return `${API_BASE}${path}`;
}

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  // prefer meta tag (e.g., Rails style) then cookie (e.g., XSRF-TOKEN)
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function withSecurityHeaders(headers: Record<string, string>): Record<string, string> {
  const csrf = readCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

async function handleJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (typeof data?.error === 'string') message = data.error;
      else if (data?.error?.message) message = data.error.message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function fetchJSON<T>(path: string): Promise<T> {
  return handleJSON<T>(fullUrl(path), {
    credentials: 'include',
    headers: withSecurityHeaders({ ...authHeaders() }),
  });
}

export function postJSON<T>(path: string, body: any): Promise<T> {
  return handleJSON<T>(fullUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: withSecurityHeaders({ 'Content-Type': 'application/json', ...authHeaders() }),
    body: JSON.stringify(body),
  });
}

export function patchJSON<T>(path: string, body: any): Promise<T> {
  return handleJSON<T>(fullUrl(path), {
    method: 'PATCH',
    credentials: 'include',
    headers: withSecurityHeaders({ 'Content-Type': 'application/json', ...authHeaders() }),
    body: JSON.stringify(body),
  });
}

export function deleteJSON<T>(path: string): Promise<T> {
  return handleJSON<T>(fullUrl(path), {
    method: 'DELETE',
    credentials: 'include',
    headers: withSecurityHeaders({ ...authHeaders() }),
  });
}
