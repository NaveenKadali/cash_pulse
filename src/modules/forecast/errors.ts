export class DomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class PlanLimitError extends DomainError {
  constructor(
    message: string = 'Forecast horizon capped at 30 days on Free plan',
    details?: Record<string, unknown>,
  ) {
    super('PLAN_LIMIT', message, details);
    this.name = 'PlanLimitError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}
