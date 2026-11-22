import { randomBytes, scryptSync } from 'node:crypto';

export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  studioId: string;
  studioName: string;
  emailVerified: boolean;
  emailVerificationToken: string;
  plan: 'Free' | 'Starter';
  createdAt: string;
}

export interface ActiveOtpRecord {
  requestId: string;
  identifier: string; // E.164 normalized phone or email
  phone?: string;
  codeHash: string;
  codeForTesting?: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthenticatedSessionUser {
  userId: string;
  studioId: string;
  role: 'Owner' | 'Team Member';
  phone?: string;
  email?: string;
  fullName?: string;
  studioName?: string;
  plan: 'Free' | 'Starter';
}

// Global in-memory registered users registry for session lifecycle
export const registeredUsersStore = new Map<string, RegisteredUser>();

// Active OTP requests for phone and email authentication
export const activeOtpStore = new Map<string, ActiveOtpRecord>();

// Live authenticated sessions keyed by session cookie value or ID
export const sessionsStore = new Map<string, AuthenticatedSessionUser>();

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  const [salt, key] = combinedHash.split(':');
  if (!salt || !key) return false;
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return derivedKey === key;
}
