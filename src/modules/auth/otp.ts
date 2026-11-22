import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import {
  AuthValidationError,
  InvalidOtpError,
  OtpExpiredError,
  OtpMaxAttemptsError,
} from './errors';
import type { OtpRequest } from './types';

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes an identifier (E.164 phone or lowercase email).
 */
export function normalizeLoginIdentifier(raw: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new AuthValidationError('Login identifier is required');
  }

  const trimmed = raw.trim();

  // Email format check
  if (trimmed.includes('@')) {
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new AuthValidationError(`Invalid email format: "${trimmed}"`);
    }
    return trimmed.toLowerCase();
  }

  // 10-digit Indian phone or standard E.164
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (trimmed.startsWith('+') && E164_PHONE_REGEX.test(trimmed)) {
    return trimmed;
  }

  throw new AuthValidationError(
    `Invalid login identifier: "${trimmed}". Expected valid E.164 phone or email.`,
  );
}

/**
 * Generates a 6-digit numeric verification code.
 */
export function generateOtpCode(): string {
  return randomInt(100000, 999999).toString();
}

/**
 * Computes SHA-256 hash of the OTP code for secure persistence.
 */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Timing-safe comparison of provided OTP code with stored SHA-256 hash.
 */
export function verifyOtpCode(candidateCode: string, storedHash: string): boolean {
  if (typeof candidateCode !== 'string' || candidateCode.length === 0) {
    return false;
  }
  const candidateHash = hashOtpCode(candidateCode);
  const bufCandidate = Buffer.from(candidateHash, 'hex');
  const bufStored = Buffer.from(storedHash, 'hex');

  if (bufCandidate.length !== bufStored.length) {
    return false;
  }
  return timingSafeEqual(bufCandidate, bufStored);
}

/**
 * Validates an OTP verification attempt against an active OtpRequest record.
 */
export function validateOtpAttempt(
  request: OtpRequest,
  code: string,
  now: Date = new Date(),
): void {
  if (now.getTime() > request.expiresAt.getTime()) {
    throw new OtpExpiredError('Verification code has expired. Please request a new code.', {
      requestId: request.id,
      expiresAt: request.expiresAt.toISOString(),
    });
  }

  if (request.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpMaxAttemptsError(
      'Maximum verification attempts exceeded. Please request a new code.',
      { requestId: request.id, attempts: request.attempts },
    );
  }

  const isMatch = verifyOtpCode(code, request.codeHash);
  if (!isMatch) {
    throw new InvalidOtpError('Incorrect verification code', {
      requestId: request.id,
      attemptsRemaining: OTP_MAX_ATTEMPTS - (request.attempts + 1),
    });
  }
}
