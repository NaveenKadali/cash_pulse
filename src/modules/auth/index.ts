// Authentication & Workspace Resolution Module (PRD FR-H-01..08, LLD §3.1, §3.2, §3.3)

export {
  AuthService,
  InMemoryOtpRepository,
  InMemorySessionRepository,
  InMemoryUserRepository,
  InMemoryStudioRepository,
  InMemoryWorkspaceMembershipRepository,
  SESSION_MAX_AGE_MS,
} from './service';

export {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  validateOtpAttempt,
  normalizeLoginIdentifier,
} from './otp';

export {
  AuthError,
  InvalidOtpError,
  OtpExpiredError,
  OtpMaxAttemptsError,
  SessionNotFoundError,
  SessionExpiredError,
  SessionRevokedError,
  UnauthorizedError,
  ForbiddenError,
  AuthValidationError,
} from './errors';

export type {
  UserRole,
  InvitationStatus,
  PlanTier,
  Studio,
  AppUser,
  WorkspaceMembership,
  OtpRequest,
  AppSession,
  SessionContext,
  RequestOtpInput,
  VerifyOtpInput,
  StudioSetupInput,
  OtpRepository,
  SessionRepository,
  UserRepository,
  StudioRepository,
  WorkspaceMembershipRepository,
} from './types';
