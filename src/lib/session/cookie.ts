export const SESSION_COOKIE_NAME = 'cp_session';

export interface SessionCookieOptions {
  maxAgeSeconds: number;
  isSecure: boolean;
}

function buildAttributes(maxAgeSeconds: number, isSecure: boolean): string {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (isSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildSessionCookie(token: string, opts: SessionCookieOptions): string {
  return `${SESSION_COOKIE_NAME}=${token}; ${buildAttributes(opts.maxAgeSeconds, opts.isSecure)}`;
}

export function buildClearSessionCookie(isSecure: boolean): string {
  return `${SESSION_COOKIE_NAME}=; ${buildAttributes(0, isSecure)}`;
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }
  const prefix = `${SESSION_COOKIE_NAME}=`;
  for (const raw of cookieHeader.split(';')) {
    const pair = raw.trim();
    if (pair.startsWith(prefix)) {
      const value = pair.slice(prefix.length);
      return value.length > 0 ? value : null;
    }
  }
  return null;
}
