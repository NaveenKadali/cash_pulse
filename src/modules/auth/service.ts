import { randomUUID } from 'node:crypto';
import {
  DEFAULT_IDLE_TIMEOUT_MS,
  generateSessionToken,
  hashSessionToken,
  isIdleExpired,
} from '../../lib/session/index';
import {
  AuthValidationError,
  InvalidOtpError,
  OtpExpiredError,
  OtpMaxAttemptsError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
  UnauthorizedError,
} from './errors';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  normalizeLoginIdentifier,
  validateOtpAttempt,
} from './otp';
import type {
  AppSession,
  AppUser,
  OtpRepository,
  OtpRequest,
  PlanTier,
  SessionContext,
  SessionRepository,
  Studio,
  StudioRepository,
  UserRepository,
  UserRole,
  WorkspaceMembership,
  WorkspaceMembershipRepository,
} from './types';

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-Memory Repositories for Unit Testing and Decoupled Operation
export class InMemoryOtpRepository implements OtpRepository {
  private readonly store = new Map<string, OtpRequest>();

  async findById(id: string): Promise<OtpRequest | null> {
    const r = this.store.get(id);
    return r ? { ...r } : null;
  }

  async findLatestByIdentifier(identifier: string): Promise<OtpRequest | null> {
    const list = Array.from(this.store.values()).filter((r) => r.identifier === identifier);
    if (list.length === 0) return null;
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { ...list[0]! };
  }

  async insert(request: OtpRequest): Promise<void> {
    this.store.set(request.id, { ...request });
  }

  async update(request: OtpRequest): Promise<void> {
    this.store.set(request.id, { ...request });
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly store = new Map<string, AppSession>();

  async findByTokenHash(tokenHash: string): Promise<AppSession | null> {
    const s = this.store.get(tokenHash);
    return s ? { ...s } : null;
  }

  async listByUser(userId: string): Promise<AppSession[]> {
    return Array.from(this.store.values())
      .filter((s) => s.userId === userId)
      .map((s) => ({ ...s }));
  }

  async insert(session: AppSession): Promise<void> {
    this.store.set(session.tokenHash, { ...session });
  }

  async update(session: AppSession): Promise<void> {
    this.store.set(session.tokenHash, { ...session });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const [key, session] of this.store.entries()) {
      if (session.userId === userId) {
        this.store.set(key, { ...session, revoked: true });
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, AppUser>();

  async findById(id: string): Promise<AppUser | null> {
    const u = this.store.get(id);
    return u ? { ...u } : null;
  }

  async findByIdentifier(identifier: string): Promise<AppUser | null> {
    const u = Array.from(this.store.values()).find(
      (user) => user.loginIdentifier === identifier,
    );
    return u ? { ...u } : null;
  }

  async findByStudioAndIdentifier(studioId: string, identifier: string): Promise<AppUser | null> {
    const u = Array.from(this.store.values()).find(
      (user) => user.studioId === studioId && user.loginIdentifier === identifier,
    );
    return u ? { ...u } : null;
  }

  async insert(user: AppUser): Promise<void> {
    this.store.set(user.id, { ...user });
  }

  async update(user: AppUser): Promise<void> {
    this.store.set(user.id, { ...user });
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryStudioRepository implements StudioRepository {
  private readonly store = new Map<string, Studio>();

  async findById(id: string): Promise<Studio | null> {
    const s = this.store.get(id);
    return s ? { ...s } : null;
  }

  async findByOwnerUser(ownerUserId: string): Promise<Studio | null> {
    const s = Array.from(this.store.values()).find((std) => std.ownerUserId === ownerUserId);
    return s ? { ...s } : null;
  }

  async insert(studio: Studio): Promise<void> {
    this.store.set(studio.id, { ...studio });
  }

  async update(studio: Studio): Promise<void> {
    this.store.set(studio.id, { ...studio });
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  private readonly store = new Map<string, WorkspaceMembership>();

  async findByPhoneOrEmail(identifier: string): Promise<WorkspaceMembership | null> {
    const m = Array.from(this.store.values()).find(
      (mem) => mem.phone === identifier || mem.email === identifier,
    );
    return m ? { ...m } : null;
  }

  async listByStudio(studioId: string): Promise<WorkspaceMembership[]> {
    return Array.from(this.store.values())
      .filter((mem) => mem.studioId === studioId)
      .map((mem) => ({ ...mem }));
  }

  async insert(membership: WorkspaceMembership): Promise<void> {
    this.store.set(membership.id, { ...membership });
  }

  async update(membership: WorkspaceMembership): Promise<void> {
    this.store.set(membership.id, { ...membership });
  }

  clear(): void {
    this.store.clear();
  }
}

export class AuthService {
  constructor(
    private readonly otpRepo: OtpRepository = new InMemoryOtpRepository(),
    private readonly sessionRepo: SessionRepository = new InMemorySessionRepository(),
    private readonly userRepo: UserRepository = new InMemoryUserRepository(),
    private readonly studioRepo: StudioRepository = new InMemoryStudioRepository(),
    private readonly membershipRepo: WorkspaceMembershipRepository = new InMemoryWorkspaceMembershipRepository(),
  ) {}

  /**
   * Universal Sign-In Entrypoint: Initiates OTP request for Phone or Email (PRD FR-H-02).
   */
  async requestOtp(
    rawIdentifier: string,
    now: Date = new Date(),
  ): Promise<{ requestId: string; identifier: string; codeForTesting: string }> {
    const identifier = normalizeLoginIdentifier(rawIdentifier);
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);

    const otpRequest: OtpRequest = {
      id: randomUUID(),
      identifier,
      codeHash,
      attempts: 0,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      createdAt: now,
    };

    await this.otpRepo.insert(otpRequest);

    return {
      requestId: otpRequest.id,
      identifier,
      codeForTesting: code,
    };
  }

  /**
   * Verifies OTP code and executes Universal Workspace Resolution (PRD FR-H-02, FR-H-07).
   */
  async verifyOtpAndLogin(
    requestId: string,
    code: string,
    now: Date = new Date(),
  ): Promise<{
    sessionToken: string;
    session: AppSession;
    context: SessionContext;
    isNewUser: boolean;
  }> {
    const otpRequest = await this.otpRepo.findById(requestId);
    if (!otpRequest) {
      throw new InvalidOtpError('OTP request not found', { requestId });
    }

    try {
      validateOtpAttempt(otpRequest, code, now);
    } catch (err) {
      // If code was wrong, record the failed attempt
      if (err instanceof InvalidOtpError) {
        otpRequest.attempts += 1;
        await this.otpRepo.update(otpRequest);
      }
      throw err;
    }

    // OTP succeeded -> mark max attempts to prevent replay
    otpRequest.attempts = OTP_MAX_ATTEMPTS;
    await this.otpRepo.update(otpRequest);

    // Workspace Resolution (FR-H-07)
    const identifier = otpRequest.identifier;
    let user = await this.userRepo.findByIdentifier(identifier);
    let studio: Studio | null = null;
    let role: UserRole = 'Owner';
    let isNewUser = false;

    // 1. Check pending invitation
    const invitation = await this.membershipRepo.findByPhoneOrEmail(identifier);
    if (invitation && !user) {
      // User accepts invitation as Team Member
      role = 'Team Member';
      studio = await this.studioRepo.findById(invitation.studioId);
      if (!studio) {
        throw new AuthValidationError('Invited studio no longer exists');
      }

      user = {
        id: randomUUID(),
        studioId: studio.id,
        roleType: 'Team Member',
        invitationStatus: 'Active',
        loginIdentifier: identifier,
        createdAt: now.toISOString(),
      };
      await this.userRepo.insert(user);

      invitation.userId = user.id;
      await this.membershipRepo.update(invitation);
    } else if (user) {
      // 2. Existing user -> resolve their studio
      studio = await this.studioRepo.findById(user.studioId);
      if (!studio) {
        throw new AuthValidationError('Associated studio no longer exists');
      }
      role = user.roleType;
    } else {
      // 3. Brand new user -> automatically provision studio on Free tier (FR-H-07, FR-H-08)
      isNewUser = true;
      role = 'Owner';

      const studioId = randomUUID();
      const userId = randomUUID();

      studio = {
        id: studioId,
        name: 'My Studio',
        timezone: 'Asia/Kolkata',
        plan: 'Free',
        ownerUserId: userId,
      };
      await this.studioRepo.insert(studio);

      user = {
        id: userId,
        studioId: studioId,
        roleType: 'Owner',
        invitationStatus: 'Active',
        loginIdentifier: identifier,
        createdAt: now.toISOString(),
      };
      await this.userRepo.insert(user);
    }

    // Issue Session Token & Store Session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    const session: AppSession = {
      id: randomUUID(),
      userId: user.id,
      studioId: studio.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS),
      lastActivityAt: now,
      revoked: false,
      createdAt: now,
    };
    await this.sessionRepo.insert(session);

    const context: SessionContext = {
      studioId: studio.id,
      userId: user.id,
      role,
      planTier: studio.plan,
      loginIdentifier: identifier,
    };

    return {
      sessionToken,
      session,
      context,
      isNewUser,
    };
  }

  /**
   * Validates session token, checks sliding idle timeout, and resolves SessionContext.
   */
  async validateSession(rawToken: string, now: Date = new Date()): Promise<SessionContext> {
    if (!rawToken || rawToken.trim().length === 0) {
      throw new UnauthorizedError('Session token is missing');
    }

    const tokenHash = hashSessionToken(rawToken.trim());
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new SessionNotFoundError('Session not found');
    }

    if (session.revoked) {
      throw new SessionRevokedError('Session has been revoked');
    }

    if (now.getTime() > session.expiresAt.getTime()) {
      throw new SessionExpiredError('Session has expired');
    }

    if (isIdleExpired(session.lastActivityAt, now, DEFAULT_IDLE_TIMEOUT_MS)) {
      session.revoked = true;
      await this.sessionRepo.update(session);
      throw new SessionExpiredError('Session expired due to inactivity');
    }

    // Refresh last activity (sliding window)
    session.lastActivityAt = now;
    await this.sessionRepo.update(session);

    const user = await this.userRepo.findById(session.userId);
    const studio = await this.studioRepo.findById(session.studioId);

    if (!user || !studio) {
      throw new UnauthorizedError('Session user or studio no longer exists');
    }

    return {
      studioId: studio.id,
      userId: user.id,
      role: user.roleType,
      planTier: studio.plan,
      loginIdentifier: user.loginIdentifier,
    };
  }

  /**
   * Revokes a specific active session.
   */
  async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = hashSessionToken(rawToken.trim());
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    if (session) {
      session.revoked = true;
      await this.sessionRepo.update(session);
    }
  }

  /**
   * Signs out all active sessions for a user (FR-H-06).
   */
  async signOutAllSessions(userId: string): Promise<void> {
    await this.sessionRepo.revokeAllForUser(userId);
  }
}
