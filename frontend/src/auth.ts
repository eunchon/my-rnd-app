export type AuthUser = {
  user_id: string;
  role: string;
  name: string;
  organization: string;
  dept?: string;
  email?: string;
};

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
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
