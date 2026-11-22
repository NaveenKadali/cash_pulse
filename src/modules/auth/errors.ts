// Authentication & Authorization Domain Errors (PRD FR-H-01..08, LLD §7, ADR-002)

export class AuthError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
  }
}

export class InvalidOtpError extends AuthError {
  constructor(message: string = 'Invalid verification code', details?: Record<string, unknown>) {
    super('INVALID_OTP', message, details);
    this.name = 'InvalidOtpError';
  }
}

export class OtpExpiredError extends AuthError {
  constructor(message: string = 'Verification code has expired', details?: Record<string, unknown>) {
    super('OTP_EXPIRED', message, details);
    this.name = 'OtpExpiredError';
  }
}

export class OtpMaxAttemptsError extends AuthError {
  constructor(
    message: string = 'Maximum verification attempts exceeded. Please request a new code.',
    details?: Record<string, unknown>,
  ) {
    super('OTP_MAX_ATTEMPTS_EXCEEDED', message, details);
    this.name = 'OtpMaxAttemptsError';
  }
}

export class SessionNotFoundError extends AuthError {
  constructor(message: string = 'Session not found', details?: Record<string, unknown>) {
    super('SESSION_NOT_FOUND', message, details);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends AuthError {
  constructor(message: string = 'Session has expired', details?: Record<string, unknown>) {
    super('SESSION_EXPIRED', message, details);
    this.name = 'SessionExpiredError';
  }
}

export class SessionRevokedError extends AuthError {
  constructor(message: string = 'Session has been revoked', details?: Record<string, unknown>) {
    super('SESSION_REVOKED', message, details);
    this.name = 'SessionRevokedError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super('UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(
    message: string = 'Access denied for the requested resource',
    details?: Record<string, unknown>,
  ) {
    super('FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
  }
}

export class AuthValidationError extends AuthError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_VALIDATION_ERROR', message, details);
    this.name = 'AuthValidationError';
  }
}
