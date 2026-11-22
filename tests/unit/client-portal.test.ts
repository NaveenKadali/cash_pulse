import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClientLinkInactiveError,
  ClientLinkNotFoundError,
  ClientPortalService,
  ClientPortalValidationError,
  InMemoryClientLinkRepository,
  buildUpiDeepLink,
  generateClientToken,
  hashClientToken,
  validateTokenEntropy,
  type PaymentRecord,
  type StudioInfo,
} from '../../src/modules/client-portal/index.js';
import { InMemoryProjectRepository } from '../../src/modules/projects/index.js';
import type { Project } from '../../src/modules/projects/types.js';

describe('Client Portal Security & Scrubbed Read Model (PRD FR-G-01..07, CP-1..CP-3, CP-5)', () => {
  const STUDIO_ID = '00000000-0000-0000-0000-000000000001';
  const OTHER_STUDIO_ID = '00000000-0000-0000-0000-000000000002';
  const PROJECT_ID = 'proj-royal-wedding';

  let linkRepo: InMemoryClientLinkRepository;
  let projectRepo: InMemoryProjectRepository;
  let service: ClientPortalService;
  let paymentsStore: PaymentRecord[];
  let studioInfo: StudioInfo;

  beforeEach(async () => {
    linkRepo = new InMemoryClientLinkRepository();
    projectRepo = new InMemoryProjectRepository();
    paymentsStore = [];

    studioInfo = {
      id: STUDIO_ID,
      name: 'Aarav Pixels',
      upiId: 'aaravpixels@icici',
      contactPhone: '+919876543210',
    };

    const project: Project = {
      id: PROJECT_ID,
      studioId: STUDIO_ID,
      clientId: 'client-1',
      eventType: 'Wedding',
      venueLocation: 'Udaipur Palace',
      primaryContactPerson: 'Kavita & Rohan',
      targetAlbumDeliveryDate: '2027-01-15',
      stage: 'Album Layout Approved',
      financialStatus: 'Partially Settled',
      contractValuePaise: 25000000n, // ₹2,50,000
      notes: 'SECRET INTERNAL NOTE: Client requested 10% discount, do not show!',
      createdAt: '2026-11-20',
    };
    await projectRepo.insert(project);

    service = new ClientPortalService(
      linkRepo,
      projectRepo,
      async (sId, pId) => (sId === STUDIO_ID && pId === PROJECT_ID ? paymentsStore : []),
      async (sId) => (sId === STUDIO_ID ? studioInfo : null),
    );
  });

  // -----------------------------------------------------------
  // 128-bit Unguessable Token Entropy & Hashing (PRD FR-G-01)
  // -----------------------------------------------------------
  describe('Token Entropy & Hashing', () => {
    it('generates a 128-bit cryptographic token with at least 32 hex characters', () => {
      const token1 = generateClientToken();
      const token2 = generateClientToken();

      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
      expect(() => validateTokenEntropy(token1)).not.toThrow();
    });

    it('hashes token deterministically using SHA-256', () => {
      const token = '1234567890abcdef1234567890abcdef';
      const hash1 = hashClientToken(token);
      const hash2 = hashClientToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    // Adversarial Negative Tests
    it('rejects tokens with insufficient entropy (< 32 hex chars)', () => {
      expect(() => validateTokenEntropy('short-token')).toThrow(ClientPortalValidationError);
      expect(() => validateTokenEntropy('1234567890123456789012345678901')).toThrow(
        ClientPortalValidationError,
      );
    });

    it('rejects hashing empty tokens', () => {
      expect(() => hashClientToken('')).toThrow(ClientPortalValidationError);
      expect(() => hashClientToken('   ')).toThrow(ClientPortalValidationError);
    });
  });

  // -----------------------------------------------------------
  // Dynamic UPI Deep Link Generation (PRD FR-G-03)
  // -----------------------------------------------------------
  describe('buildUpiDeepLink', () => {
    it('generates an NPCI-compliant UPI payment link with safe parameter encoding', () => {
      const upiUrl = buildUpiDeepLink(
        'studio@icici',
        'Aarav Pixels',
        15000000n, // ₹1,50,000.00
        'Invoice 108 – Kavita & Rohan',
      );

      expect(upiUrl).toContain('upi://pay?');
      expect(upiUrl).toContain('pa=studio%40icici');
      expect(upiUrl).toContain('pn=Aarav+Pixels');
      expect(upiUrl).toContain('am=150000.00');
      expect(upiUrl).toContain('cu=INR');
    });
  });

  // -----------------------------------------------------------
  // Link Lifecycle & Read Model (Positive & Adversarial)
  // -----------------------------------------------------------
  describe('ClientPortalService Flow', () => {
    it('issues a link and serves scrubbed read-model for client', async () => {
      paymentsStore.push({
        amountPaise: 7500000n, // ₹75,000 paid (30% advance)
        receivedOn: '2026-11-21',
        paymentMode: 'UPI',
        voided: false,
      });

      const { rawToken, clientPageUrl } = await service.issueLink(STUDIO_ID, PROJECT_ID);

      expect(rawToken).toHaveLength(32);
      expect(clientPageUrl).toBe(`/p/${rawToken}`);

      const data = await service.getClientPortalData(rawToken, '2026-11-22');

      expect(data.projectName).toBe('Wedding - Kavita & Rohan');
      expect(data.totalPackageAmountPaise).toBe(25000000n);
      expect(data.amountPaidPaise).toBe(7500000n);
      expect(data.pendingBalancePaise).toBe(17500000n); // ₹1,75,000
      expect(data.deliverableStage).toBe('Album Layout Approved');
      expect(data.isDeliverableHold).toBe(true); // Hold active because stage > proofs and balance > 0
      expect(data.studioName).toBe('Aarav Pixels');
      expect(data.studioUpiId).toBe('aaravpixels@icici');
      expect(data.upiDeepLink).toContain('am=175000.00');
      expect(data.paymentHistory).toHaveLength(1);
      expect(data.paymentHistory[0]?.amountPaise).toBe(7500000n);

      // CRITICAL PRIVACY ASSERTIONS (PRD FR-G-06): internal notes and costs must NEVER be present!
      expect((data as any).notes).toBeUndefined();
      expect((data as any).vendorCosts).toBeUndefined();
      expect((data as any).profitMargin).toBeUndefined();
    });

    it('sets upiDeepLink to null when pending balance is zero', async () => {
      paymentsStore.push({
        amountPaise: 25000000n, // Fully paid
        receivedOn: '2026-11-21',
        paymentMode: 'Bank transfer',
        voided: false,
      });

      const { rawToken } = await service.issueLink(STUDIO_ID, PROJECT_ID);
      const data = await service.getClientPortalData(rawToken, '2026-11-22');

      expect(data.pendingBalancePaise).toBe(0n);
      expect(data.upiDeepLink).toBeNull();
      expect(data.isDeliverableHold).toBe(false);
    });

    it('immediately halts access upon link revocation (PRD FR-G-07)', async () => {
      const { rawToken, clientLink } = await service.issueLink(STUDIO_ID, PROJECT_ID);

      // Verify active
      await expect(service.getClientPortalData(rawToken, '2026-11-22')).resolves.toBeDefined();

      // Revoke immediately
      await service.revokeLink(STUDIO_ID, clientLink.id);

      // Access must immediately fail with generic inactive message
      await expect(service.getClientPortalData(rawToken, '2026-11-22')).rejects.toThrow(
        ClientLinkInactiveError,
      );
    });

    it('updates expiration date of an existing link (CP-7)', async () => {
      const { rawToken, clientLink } = await service.issueLink(STUDIO_ID, PROJECT_ID, 10, '2026-11-20');

      // Extend to 2027-01-01
      await service.updateExpiry(STUDIO_ID, clientLink.id, '2027-01-01');

      // Check access in December (would have failed under original 10-day expiry)
      const data = await service.getClientPortalData(rawToken, '2026-12-15');
      expect(data).toBeDefined();
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 Ratio)
    // -----------------------------------------------------------
    it('rejects access for a non-existent or fabricated token', async () => {
      const fakeToken = 'ffffffffffffffffffffffffffffffff';
      await expect(service.getClientPortalData(fakeToken, '2026-11-22')).rejects.toThrow(
        ClientLinkInactiveError,
      );
    });

    it('rejects access when link expiration date has passed', async () => {
      const { rawToken } = await service.issueLink(STUDIO_ID, PROJECT_ID, 5, '2026-11-20');

      // 6 days later (expired)
      await expect(service.getClientPortalData(rawToken, '2026-11-26')).rejects.toThrow(
        ClientLinkInactiveError,
      );
    });

    it('ignores voided payments when computing client balance', async () => {
      paymentsStore.push(
        {
          amountPaise: 5000000n,
          receivedOn: '2026-11-21',
          paymentMode: 'UPI',
          voided: false,
        },
        {
          amountPaise: 10000000n, // Voided duplicate payment
          receivedOn: '2026-11-21',
          paymentMode: 'UPI',
          voided: true,
        },
      );

      const { rawToken } = await service.issueLink(STUDIO_ID, PROJECT_ID);
      const data = await service.getClientPortalData(rawToken, '2026-11-22');

      // Only the 50,000 payment counts, not the voided 1,00,000
      expect(data.amountPaidPaise).toBe(5000000n);
      expect(data.pendingBalancePaise).toBe(20000000n); // 2,50,000 - 50,000
      expect(data.paymentHistory).toHaveLength(1);
    });

    it('rejects issuing a link for a non-existent project', async () => {
      await expect(
        service.issueLink(STUDIO_ID, 'non-existent-project'),
      ).rejects.toThrow(ClientPortalValidationError);
    });

    it('rejects issuing a link when studioId is missing', async () => {
      await expect(
        service.issueLink('', PROJECT_ID),
      ).rejects.toThrow(ClientPortalValidationError);
    });

    it('rejects revoking a link from another studio (cross-tenant isolation)', async () => {
      const { clientLink } = await service.issueLink(STUDIO_ID, PROJECT_ID);

      await expect(
        service.revokeLink(OTHER_STUDIO_ID, clientLink.id),
      ).rejects.toThrow(ClientLinkNotFoundError);
    });

    it('rejects updateExpiry with an invalid calendar date format', async () => {
      const { clientLink } = await service.issueLink(STUDIO_ID, PROJECT_ID);

      await expect(
        service.updateExpiry(STUDIO_ID, clientLink.id, '2026-02-30'),
      ).rejects.toThrow(ClientPortalValidationError);
    });
  });
});
