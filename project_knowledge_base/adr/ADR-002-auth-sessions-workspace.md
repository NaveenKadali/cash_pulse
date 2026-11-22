# ADR-002: Authentication, Session Management, and Workspace Resolution (D2)

- **Status:** Accepted (Decided)
- **Date:** 2026-11-22
- **Deciders:** Product Owner, Lead Architect
- **Technical Story:** D2 (Auth Lane) — Unblocks Auth domain module implementation

---

## Context and Problem Statement

The Auth lane requires concrete architectural decisions for identity verification, session storage, and multi-tenant workspace resolution ([PRD-001 FR-H-01 to FR-H-08](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/prd/PRD-001.md), [HLD-001 §11a](file:///home/nvnk/projects/cash_pulse/project_knowledge_base/architecture/HLD-001.md)):
1. Universal sign-in must accept both Phone (SMS OTP) and Email without role-specific login buttons.
2. How sessions are issued, stored, and revoked immediately across all devices.
3. How verification codes (OTP/magic links) are stored and protected against brute-force attacks.
4. The exact deterministic deterministic resolution flow from a verified identifier to the active workspace.

---

## Decision Outcome

**Decided Architecture for Auth Lane (D2):**

### 1. Universal Sign-In & OTP Security
* **Verification Methods**: "Continue with Phone" (SMS OTP via `SmsOtpAdapter`) and "Continue with Email" (login link or OTP).
* **Storage Security**:
  * Temporary OTP codes and login tokens are never stored in plaintext. They are hashed using **SHA-256** before database insertion (`otp_request.code_hash`).
  * **TTL**: Strict 10-minute expiration.
  * **Throttling**: Maximum 3 failed verification attempts before invalidating the OTP request.
  * Rate-limit of 1 request per phone/email per 60 seconds.

### 2. Session Management
* **Cookie-Based Sessions**:
  * Issued as a signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `__session` (compatible with modern browsers and Edge SSR).
  * Contains an opaque 256-bit cryptographically secure token (`crypto.randomBytes(32).toString('base64url')`).
* **Session Persistence**:
  * Stored in the database table `app_session (id uuid PRIMARY KEY, user_id uuid NOT NULL, studio_id uuid NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL)`.
  * Allows instantaneous single-session logout or "Sign out of all sessions" (`DELETE /api/auth/session`).

### 3. Workspace Resolution Engine
Following successful verification of phone or email, the resolution algorithm executes:
```
1. Look up workspace_membership where (phone = verifiedIdentifier OR email = verifiedIdentifier) AND user_id IS NULL:
   --> Found pending invitation:
       - Link user_id to workspace_membership
       - Update app_user.invitation_status = 'Active'
       - Activate session as Role: Team Member in inviting Studio.
2. Else look up studio where owner_user_id = user.id:
   --> Found existing studio:
       - Activate session as Role: Owner in that Studio.
3. Else:
   --> New user (no studio, no pending invitation):
       - Redirect to lightweight 30-second studio setup:
         POST /api/studio (studio name, timezone: 'Asia/Kolkata', plan: 'Free')
       - Sets studio.owner_user_id = user.id
       - Provisions default Free tier (max 3 active projects, 30-day runway cap).
```

### 4. RBAC & Studio Isolation Invariant
* Every domain operation accepts `SessionContext { userId: string; studioId: string; role: 'Owner' | 'Team Member' }`.
* Database queries strictly include `WHERE studio_id = ctx.studioId`. Cross-studio joins or queries are prohibited.
* Team Members are blocked at the service layer from accessing bank balances, profit, forecasts, payables, or client links.
