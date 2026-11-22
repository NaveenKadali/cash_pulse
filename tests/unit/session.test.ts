import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IDLE_TIMEOUT_MS,
  buildClearSessionCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  isIdleExpired,
  parseSessionCookie,
} from '../../src/lib/session/index.js';

describe('session token', () => {
  it('generates a 43-char base64url token that differs across calls', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toHaveLength(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it('hashes deterministically to 64 hex chars, never equal to the token', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });
});

describe('session cookie', () => {
  it('contains HttpOnly and SameSite=Lax', () => {
    const cookie = buildSessionCookie('abc', { maxAgeSeconds: 1800, isSecure: false });
    expect(cookie).toContain('cp_session=abc');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=1800');
    expect(cookie).toContain('Path=/');
  });

  it('contains Secure only when isSecure is true', () => {
    const secure = buildSessionCookie('abc', { maxAgeSeconds: 60, isSecure: true });
    const plain = buildSessionCookie('abc', { maxAgeSeconds: 60, isSecure: false });
    expect(secure).toContain('Secure');
    expect(plain).not.toContain('Secure');
  });

  it('clear cookie uses Max-Age=0 with the same attributes', () => {
    const cleared = buildClearSessionCookie(true);
    expect(cleared).toContain('cp_session=;');
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('SameSite=Lax');
    expect(cleared).toContain('Secure');
  });

  it('parseSessionCookie reads cp_session among other cookies and returns null when missing', () => {
    expect(parseSessionCookie('theme=dark; cp_session=tok123; lang=en')).toBe('tok123');
    expect(parseSessionCookie('theme=dark; lang=en')).toBeNull();
    expect(parseSessionCookie('cp_session=')).toBeNull();
    expect(parseSessionCookie(undefined)).toBeNull();
  });
});

describe('isIdleExpired', () => {
  it('is true at exactly the timeout and false one ms less', () => {
    const last = new Date('2024-01-01T00:00:00.000Z');
    const at = new Date(last.getTime() + DEFAULT_IDLE_TIMEOUT_MS);
    const justBefore = new Date(last.getTime() + DEFAULT_IDLE_TIMEOUT_MS - 1);
    expect(isIdleExpired(last, at, DEFAULT_IDLE_TIMEOUT_MS)).toBe(true);
    expect(isIdleExpired(last, justBefore, DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
  });
});
