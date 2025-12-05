export type AuthUser = {
  user_id: string;
  role: string;
  name: string;
  organization: string;
  dept?: string;
  email?: string;
};

function decodeBase64UrlToString(segment: string) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(decodeBase64UrlToString(payload));
    return {
      user_id: decoded.user_id,
      role: decoded.role,
      name: decoded.name,
      organization: decoded.organization,
      dept: decoded.dept,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
}
