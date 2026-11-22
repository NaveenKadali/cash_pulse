// Projects module errors. Codes are stable identifiers for API consumers.

export class ProjectsError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ProjectsError';
    this.code = code;
    this.details = details;
  }
}

export class ClientNotFoundError extends ProjectsError {
  constructor(clientId: string, details?: Record<string, unknown>) {
    super('CLIENT_NOT_FOUND', `Client "${clientId}" was not found`, { clientId, ...details });
    this.name = 'ClientNotFoundError';
  }
}

export class ClientValidationError extends ProjectsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ClientValidationError';
  }
}

export class ProjectNotFoundError extends ProjectsError {
  constructor(projectId: string, details?: Record<string, unknown>) {
    super('PROJECT_NOT_FOUND', `Project "${projectId}" was not found`, { projectId, ...details });
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectValidationError extends ProjectsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ProjectValidationError';
  }
}

export class InvalidStageTransitionError extends ProjectsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INVALID_STAGE_TRANSITION', message, details);
    this.name = 'InvalidStageTransitionError';
  }
}

export class ProjectPlanLimitError extends ProjectsError {
  constructor(message: string = 'Active projects limit reached on Free plan', details?: Record<string, unknown>) {
    super('PLAN_LIMIT', message, details);
    this.name = 'ProjectPlanLimitError';
  }
}
