// Authentication & Workspace Resolution Types (PRD FR-H-01..08, LLD §3.1, §3.2, §3.3)

export type UserRole = 'Owner' | 'Team Member';
export type InvitationStatus = 'Invited' | 'Active' | 'Revoked';
export type PlanTier = 'Free' | 'Starter';

export interface Studio {
  id: string;
  name: string;
  timezone: string;
  plan: PlanTier;
  ownerUserId: string | null;
  upiId?: string | null;
  contactPhone?: string | null;
}

export interface AppUser {
  id: string;
  studioId: string;
  roleType: UserRole;
  invitationStatus: InvitationStatus;
  loginIdentifier: string; // E.164 phone or email
  createdAt: string;
}

export interface WorkspaceMembership {
  id: string;
  studioId: string;
  userId: string | null;
  roleType: UserRole;
  source: 'Invitation' | 'Owner';
  phone?: string | null;
  email?: string | null;
}

export interface OtpRequest {
  id: string;
  identifier: string; // E.164 phone or email
  codeHash: string; // SHA-256
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface AppSession {
  id: string;
  userId: string;
  studioId: string;
  tokenHash: string; // SHA-256
  expiresAt: Date;
  lastActivityAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface SessionContext {
  studioId: string;
  userId: string;
  role: UserRole;
  planTier: PlanTier;
  loginIdentifier: string;
}

export interface RequestOtpInput {
  identifier: string; // Phone or Email
}

export interface VerifyOtpInput {
  requestId: string;
  code: string;
}

export interface StudioSetupInput {
  userId: string;
  loginIdentifier: string;
  studioName: string;
  upiId: string;
  openingBalancePaise?: bigint;
}

// Repositories
export interface OtpRepository {
  findById(id: string): Promise<OtpRequest | null>;
  findLatestByIdentifier(identifier: string): Promise<OtpRequest | null>;
  insert(request: OtpRequest): Promise<void>;
  update(request: OtpRequest): Promise<void>;
}

export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<AppSession | null>;
  listByUser(userId: string): Promise<AppSession[]>;
  insert(session: AppSession): Promise<void>;
  update(session: AppSession): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export interface UserRepository {
  findById(id: string): Promise<AppUser | null>;
  findByIdentifier(identifier: string): Promise<AppUser | null>;
  findByStudioAndIdentifier(studioId: string, identifier: string): Promise<AppUser | null>;
  insert(user: AppUser): Promise<void>;
  update(user: AppUser): Promise<void>;
}

export interface StudioRepository {
  findById(id: string): Promise<Studio | null>;
  findByOwnerUser(ownerUserId: string): Promise<Studio | null>;
  insert(studio: Studio): Promise<void>;
  update(studio: Studio): Promise<void>;
}

export interface WorkspaceMembershipRepository {
  findByPhoneOrEmail(identifier: string): Promise<WorkspaceMembership | null>;
  listByStudio(studioId: string): Promise<WorkspaceMembership[]>;
  insert(membership: WorkspaceMembership): Promise<void>;
  update(membership: WorkspaceMembership): Promise<void>;
}
