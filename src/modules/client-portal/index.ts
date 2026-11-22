// Client Portal Module (PRD FR-G-01..07)

export {
  ClientPortalService,
  InMemoryClientLinkRepository,
  buildUpiDeepLink,
} from './service';

export {
  generateClientToken,
  hashClientToken,
  validateTokenEntropy,
} from './tokens';

export {
  ClientPortalError,
  ClientLinkInactiveError,
  ClientLinkNotFoundError,
  ClientPortalValidationError,
} from './errors';

export type {
  ClientLink,
  ClientLinkStatus,
  ClientPortalPaymentRecord,
  ClientPortalReadModel,
  ClientLinkRepository,
} from './types';

export type {
  PaymentRecord,
  StudioInfo,
  SubmitPaymentClaimInput,
  ClientPaymentClaimResult,
} from './service';
