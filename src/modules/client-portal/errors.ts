// Client Portal Errors (PRD FR-G-01..07)

export class ClientPortalError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ClientPortalError';
    this.code = code;
    this.details = details;
  }
}

export class ClientLinkInactiveError extends ClientPortalError {
  constructor(message: string = 'Link is no longer active', details?: Record<string, unknown>) {
    super('CLIENT_LINK_INACTIVE', message, details);
    this.name = 'ClientLinkInactiveError';
  }
}

export class ClientLinkNotFoundError extends ClientPortalError {
  constructor(linkId: string, details?: Record<string, unknown>) {
    super('CLIENT_LINK_NOT_FOUND', `Client link "${linkId}" was not found`, {
      linkId,
      ...details,
    });
    this.name = 'ClientLinkNotFoundError';
  }
}

export class ClientPortalValidationError extends ClientPortalError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CLIENT_PORTAL_VALIDATION', message, details);
    this.name = 'ClientPortalValidationError';
  }
}
