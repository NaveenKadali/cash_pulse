import { createHash, randomBytes } from 'node:crypto';
import { ClientPortalValidationError } from './errors';

/**
 * Generates an unguessable guest token with at least 128 bits of cryptographic randomness (PRD FR-G-01).
 * 16 bytes in hex representation gives 32 characters (128 bits entropy).
 */
export function generateClientToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Computes SHA-256 hash of the guest token for secure storage.
 * The raw token is never persisted in the database.
 */
export function hashClientToken(rawToken: string): string {
  if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    throw new ClientPortalValidationError('Client token cannot be empty');
  }
  return createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Validates that a raw token satisfies the 128-bit cryptographic entropy invariant.
 */
export function validateTokenEntropy(rawToken: string): void {
  if (typeof rawToken !== 'string' || rawToken.trim().length < 32) {
    throw new ClientPortalValidationError(
      'Client token does not meet the minimum 128-bit entropy requirement (at least 32 hex chars)',
      { tokenLength: typeof rawToken === 'string' ? rawToken.length : 0 },
    );
  }
}
