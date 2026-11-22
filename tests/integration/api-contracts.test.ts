import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:3000/api';

describe('LLD §7 & §8 Canonical API Contracts Test Suite', { timeout: 20000 }, () => {
  const OWNER_AUTH = { Cookie: '__session=session_owner_test' };
  const TEAM_AUTH = { Cookie: '__session=session_team_member_test' };

  describe('1. Auth & Session Endpoints', () => {
    it('POST /auth/otp/request rejects invalid phone format with VALIDATION_FAILED (400)', async () => {
      const res = await fetch(`${BASE_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '12345' }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_FAILED');
    }, 15000);

    it('POST /auth/otp/request accepts valid Indian E.164 phone (+91...) (200)', async () => {
      const res = await fetch(`${BASE_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876543210' }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.requestId).toBeDefined();
    });

    it('POST /auth/email/login generates session cookie for valid email (200)', async () => {
      const res = await fetch(`${BASE_URL}/auth/email/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav@aaravpixels.com' }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.resolvedWorkspace.studioName).toBe('Aarav Pixels');
    });

    it('GET /auth/session returns 401 UNAUTHENTICATED without cookie', async () => {
      const res = await fetch(`${BASE_URL}/auth/session`);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.code).toBe('UNAUTHENTICATED');
    });

    it('GET /session/workspaces returns workspace memberships for authenticated user', async () => {
      const res = await fetch(`${BASE_URL}/session/workspaces`, { headers: OWNER_AUTH });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].studioName).toBe('Aarav Pixels');
    });
  });

  describe('2. Studio & RBAC Isolation', () => {
    it('GET /studio allows Owner (200) and forbids Team Member with 403 FORBIDDEN', async () => {
      const ownerRes = await fetch(`${BASE_URL}/studio`, { headers: OWNER_AUTH });
      expect(ownerRes.status).toBe(200);

      const teamRes = await fetch(`${BASE_URL}/studio`, { headers: TEAM_AUTH });
      const teamData = await teamRes.json();
      expect(teamRes.status).toBe(403);
      expect(teamData.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Projects & Milestone Schedules', () => {
    it('GET /projects scrubs money fields for Team Member (LLD §8 ProjectOpsResource)', async () => {
      const res = await fetch(`${BASE_URL}/projects`, { headers: TEAM_AUTH });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data[0].contractValuePaise).toBeUndefined();
      expect(data[0].financialStatus).toBeUndefined();
      expect(data[0].venueLocation).toBe('Delhi');
    });

    it('POST /projects/:id/stage forbids setting Stage 7 manually (INVALID_STAGE_TRANSITION)', async () => {
      const res = await fetch(`${BASE_URL}/projects/proj-verma/stage`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'Financial Closed' }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe('INVALID_STAGE_TRANSITION');
    });

    it('PUT /projects/:id/milestones rejects schedules that do not sum to contract value', async () => {
      const res = await fetch(`${BASE_URL}/projects/proj-verma/milestones`, {
        method: 'PUT',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractValuePaise: '10000000',
          milestones: [
            { id: 'm1', amountPaise: '5000000' },
            { id: 'm2', amountPaise: '4000000' }, // Sum is 9,00,000, not 10,00,000
          ],
        }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe('MILESTONE_SUM_MISMATCH');
    });
  });

  describe('4. Invoicing, Payments & Idempotency', () => {
    it('POST /milestones/:id/payments rejects request without Idempotency-Key header (400)', async () => {
      const res = await fetch(`${BASE_URL}/milestones/ms-v1/payments`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise: '1000000' }),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('POST /milestones/:id/payments records payment with Idempotency-Key and replays safely', async () => {
      const key = `idem-${Date.now()}`;
      const payload = { amountPaise: '1000000', payerName: 'Client Replay Test' };

      const firstRes = await fetch(`${BASE_URL}/milestones/ms-v1/payments`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(payload),
      });
      const firstData = await firstRes.json();
      expect(firstRes.status).toBe(201);
      expect(firstData.amountPaise).toBe('1000000');

      // Replay
      const secondRes = await fetch(`${BASE_URL}/milestones/ms-v1/payments`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(payload),
      });
      const secondData = await secondRes.json();
      expect(secondRes.status).toBe(200);
      expect(secondRes.headers.get('idempotent-replay')).toBe('true');
      expect(secondData.id).toBe(firstData.id);
    });
  });

  describe('5. Forecast & Plan Limits', () => {
    it('POST /forecast/runs rejects Free plan horizon > 30 days with PLAN_LIMIT (403)', async () => {
      const res = await fetch(`${BASE_URL}/forecast/runs`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizonDays: 60 }),
      });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.code).toBe('PLAN_LIMIT');
    });

    it('POST /forecast/runs succeeds within 30 days and projects cash trajectory (200)', async () => {
      const res = await fetch(`${BASE_URL}/forecast/runs`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizonDays: 30 }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.days.length).toBeGreaterThanOrEqual(30);
      expect(data.lowestBalanceDate).toBe('2026-12-04');
    });
  });

  describe('6. Dashboard & Nudges', () => {
    it('GET /dashboard/summary returns morning brief and debtor radar (200)', async () => {
      const res = await fetch(`${BASE_URL}/dashboard/summary`, { headers: OWNER_AUTH });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.availableCashPaise).toBe('2400000');
      expect(data.morningBrief.greeting).toContain('Aarav');
    });

    it('POST /projects/:id/nudges generates tone draft with fallback support', async () => {
      const res = await fetch(`${BASE_URL}/projects/proj-verma/nudges`, {
        method: 'POST',
        headers: { ...OWNER_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 'Formal' }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.draft).toBeDefined();
    }, 15000);

    it('POST /projects/:id/client-links issues guest token with rawToken visible once (201)', async () => {
      const res = await fetch(`${BASE_URL}/projects/proj-verma/client-links`, {
        method: 'POST',
        headers: OWNER_AUTH,
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.rawToken).toBeDefined();
      expect(data.url).toContain('/p/');
    });
  });
});
