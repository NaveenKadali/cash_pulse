import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuthService,
  AuthValidationError,
  InMemoryOtpRepository,
  InMemorySessionRepository,
  InMemoryStudioRepository,
  InMemoryUserRepository,
  InMemoryWorkspaceMembershipRepository,
  InvalidOtpError,
  OtpExpiredError,
  OtpMaxAttemptsError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
  UnauthorizedError,
  normalizeLoginIdentifier,
} from '../../src/modules/auth/index.js';

describe('Authentication & Workspace Resolution (PRD FR-H-01..08, AU-1..AU-5)', () => {
  let otpRepo: InMemoryOtpRepository;
  let sessionRepo: InMemorySessionRepository;
  let userRepo: InMemoryUserRepository;
  let studioRepo: InMemoryStudioRepository;
  let membershipRepo: InMemoryWorkspaceMembershipRepository;
  let authService: AuthService;

  beforeEach(() => {
    otpRepo = new InMemoryOtpRepository();
    sessionRepo = new InMemorySessionRepository();
    userRepo = new InMemoryUserRepository();
    studioRepo = new InMemoryStudioRepository();
    membershipRepo = new InMemoryWorkspaceMembershipRepository();

    authService = new AuthService(
      otpRepo,
      sessionRepo,
      userRepo,
      studioRepo,
      membershipRepo,
    );
  });

  // -----------------------------------------------------------
  // Identifier Normalization (Phone & Email)
  // -----------------------------------------------------------
  describe('normalizeLoginIdentifier', () => {
    it('normalizes 10-digit Indian phone numbers to E.164 with +91', () => {
      expect(normalizeLoginIdentifier('9876543210')).toBe('+919876543210');
      expect(normalizeLoginIdentifier('+91 98765 43210')).toBe('+919876543210');
    });

    it('normalizes email addresses to lowercase', () => {
      expect(normalizeLoginIdentifier('Aarav@Studio.com')).toBe('aarav@studio.com');
      expect(normalizeLoginIdentifier('  owner@cashpulse.in  ')).toBe('owner@cashpulse.in');
    });

    // Adversarial Negative Tests
    it('rejects empty or whitespace identifier', () => {
      expect(() => normalizeLoginIdentifier('')).toThrow(AuthValidationError);
      expect(() => normalizeLoginIdentifier('   ')).toThrow(AuthValidationError);
    });

    it('rejects invalid email formats', () => {
      expect(() => normalizeLoginIdentifier('not-an-email')).toThrow(AuthValidationError);
      expect(() => normalizeLoginIdentifier('user@domain')).toThrow(AuthValidationError);
    });

    it('rejects invalid phone formats with letters or too few digits', () => {
      expect(() => normalizeLoginIdentifier('12345')).toThrow(AuthValidationError);
      expect(() => normalizeLoginIdentifier('+91abc4567890')).toThrow(AuthValidationError);
    });
  });

  // -----------------------------------------------------------
  // OTP Flow & Workspace Resolution (Positive & Adversarial)
  // -----------------------------------------------------------
  describe('requestOtp & verifyOtpAndLogin', () => {
    it('allows a new user to sign in with phone OTP and provisions a Free tier studio', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', now);

      expect(req.requestId).toBeDefined();
      expect(req.identifier).toBe('+919876543210');
      expect(req.codeForTesting).toMatch(/^\d{6}$/);

      const loginResult = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, now);

      expect(loginResult.isNewUser).toBe(true);
      expect(loginResult.sessionToken).toBeDefined();
      expect(loginResult.context.role).toBe('Owner');
      expect(loginResult.context.planTier).toBe('Free');
      expect(loginResult.context.loginIdentifier).toBe('+919876543210');
    });

    it('resolves an invited team member into their invited studio', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const studioId = 'studio-100';

      // Seed existing studio and invitation
      await studioRepo.insert({
        id: studioId,
        name: 'Grand Photo Studio',
        timezone: 'Asia/Kolkata',
        plan: 'Starter',
        ownerUserId: 'owner-1',
      });

      await membershipRepo.insert({
        id: 'invitation-1',
        studioId,
        userId: null,
        roleType: 'Team Member',
        source: 'Invitation',
        phone: '+919988776655',
        email: null,
      });

      const req = await authService.requestOtp('9988776655', now);
      const loginResult = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, now);

      expect(loginResult.isNewUser).toBe(false);
      expect(loginResult.context.studioId).toBe(studioId);
      expect(loginResult.context.role).toBe('Team Member');
      expect(loginResult.context.planTier).toBe('Starter');
    });

    it('returns existing studio for a returning owner', async () => {
      const now = new Date('2026-11-22T10:00:00Z');

      // First login (provisions studio)
      const req1 = await authService.requestOtp('9876543210', now);
      const res1 = await authService.verifyOtpAndLogin(req1.requestId, req1.codeForTesting, now);

      // Second login (re-authenticates same studio)
      const req2 = await authService.requestOtp('9876543210', new Date('2026-11-23T10:00:00Z'));
      const res2 = await authService.verifyOtpAndLogin(req2.requestId, req2.codeForTesting, new Date('2026-11-23T10:00:00Z'));

      expect(res2.isNewUser).toBe(false);
      expect(res2.context.studioId).toBe(res1.context.studioId);
      expect(res2.context.userId).toBe(res1.context.userId);
      expect(res2.context.role).toBe('Owner');
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 Ratio)
    // -----------------------------------------------------------
    it('rejects verification with wrong code and tracks attempt count', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', now);

      await expect(
        authService.verifyOtpAndLogin(req.requestId, '000000', now),
      ).rejects.toThrow(InvalidOtpError);

      const storedReq = await otpRepo.findById(req.requestId);
      expect(storedReq?.attempts).toBe(1);
    });

    it('enforces maximum attempts limit and blocks brute force after 5 failures', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', now);

      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        await expect(authService.verifyOtpAndLogin(req.requestId, '000000', now)).rejects.toThrow(
          InvalidOtpError,
        );
      }

      // 5th attempt (hits max attempts limit)
      await expect(authService.verifyOtpAndLogin(req.requestId, '000000', now)).rejects.toThrow(
        InvalidOtpError,
      );

      // 6th attempt is blocked outright with OtpMaxAttemptsError even if correct code is supplied
      await expect(
        authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, now),
      ).rejects.toThrow(OtpMaxAttemptsError);
    });

    it('rejects expired OTP after 10-minute TTL has elapsed', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', now);

      // 10 minutes and 1 second later
      const later = new Date(now.getTime() + 10 * 60 * 1000 + 1000);

      await expect(
        authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, later),
      ).rejects.toThrow(OtpExpiredError);
    });

    it('prevents OTP replay attacks once successfully verified', async () => {
      const now = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', now);

      // First verification succeeds
      await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, now);

      // Replay attempt fails immediately
      await expect(
        authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, now),
      ).rejects.toThrow(OtpMaxAttemptsError);
    });

    it('rejects verification for a non-existent requestId', async () => {
      await expect(
        authService.verifyOtpAndLogin('non-existent-id', '123456'),
      ).rejects.toThrow(InvalidOtpError);
    });
  });

  // -----------------------------------------------------------
  // Session Validation & Lifecycle (Positive & Adversarial)
  // -----------------------------------------------------------
  describe('validateSession, revokeSession & signOutAllSessions', () => {
    it('validates active session and updates sliding activity window', async () => {
      const t0 = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', t0);
      const login = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, t0);

      // 15 minutes later (within 30-min idle window)
      const t1 = new Date('2026-11-22T10:15:00Z');
      const context = await authService.validateSession(login.sessionToken, t1);

      expect(context.studioId).toBe(login.context.studioId);
      expect(context.role).toBe('Owner');
    });

    it('revokes a specific session upon logout', async () => {
      const t0 = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', t0);
      const login = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, t0);

      await authService.revokeSession(login.sessionToken);

      await expect(authService.validateSession(login.sessionToken, t0)).rejects.toThrow(
        SessionRevokedError,
      );
    });

    it('signs out all active sessions for a user (FR-H-06)', async () => {
      const t0 = new Date('2026-11-22T10:00:00Z');

      // Login 1 (e.g. laptop)
      const req1 = await authService.requestOtp('9876543210', t0);
      const login1 = await authService.verifyOtpAndLogin(req1.requestId, req1.codeForTesting, t0);

      // Login 2 (e.g. phone)
      const req2 = await authService.requestOtp('9876543210', t0);
      const login2 = await authService.verifyOtpAndLogin(req2.requestId, req2.codeForTesting, t0);

      // Sign out all
      await authService.signOutAllSessions(login1.context.userId);

      await expect(authService.validateSession(login1.sessionToken, t0)).rejects.toThrow(
        SessionRevokedError,
      );
      await expect(authService.validateSession(login2.sessionToken, t0)).rejects.toThrow(
        SessionRevokedError,
      );
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 Ratio)
    // -----------------------------------------------------------
    it('rejects validation when session token is missing or empty', async () => {
      await expect(authService.validateSession('')).rejects.toThrow(UnauthorizedError);
      await expect(authService.validateSession('   ')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects validation for an unknown token', async () => {
      await expect(authService.validateSession('random-bogus-token')).rejects.toThrow(
        SessionNotFoundError,
      );
    });

    it('rejects validation when idle timeout (30 min) is exceeded', async () => {
      const t0 = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', t0);
      const login = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, t0);

      // 31 minutes later with no activity
      const t1 = new Date('2026-11-22T10:31:00Z');
      await expect(authService.validateSession(login.sessionToken, t1)).rejects.toThrow(
        SessionExpiredError,
      );
    });

    it('rejects validation when session max-age (7 days) is exceeded', async () => {
      const t0 = new Date('2026-11-22T10:00:00Z');
      const req = await authService.requestOtp('9876543210', t0);
      const login = await authService.verifyOtpAndLogin(req.requestId, req.codeForTesting, t0);

      // 7 days and 1 second later
      const t1 = new Date(t0.getTime() + 7 * 24 * 60 * 60 * 1000 + 1000);
      await expect(authService.validateSession(login.sessionToken, t1)).rejects.toThrow(
        SessionExpiredError,
      );
    });
  });
});
