import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClientLinkInactiveError,
  ClientPortalService,
  ClientPortalValidationError,
  InMemoryClientLinkRepository,
} from '../../src/modules/client-portal/index.js';
import {
  InvoicingService,
  InvoicingValidationError,
  type Payment,
} from '../../src/modules/invoicing/index.js';
import { InMemoryProjectRepository } from '../../src/modules/projects/index.js';
import type { Project } from '../../src/modules/projects/types.js';

describe('Client Payment Claims & "I have paid" Submission (PRD FR-G-04, IN-6, CP-4)', () => {
  const STUDIO_ID = 'studio-001';
  const PROJECT_ID = 'proj-wedding-001';
  const MILESTONE_ID = 'ms-advance';

  let invoicingService: InvoicingService;
  let clientPortalService: ClientPortalService;
  let linkRepo: InMemoryClientLinkRepository;
  let projectRepo: InMemoryProjectRepository;
  let recordedPayments: Payment[];
  let activeToken: string;

  beforeEach(async () => {
    invoicingService = new InvoicingService();
    linkRepo = new InMemoryClientLinkRepository();
    projectRepo = new InMemoryProjectRepository();
    recordedPayments = [];

    const project: Project = {
      id: PROJECT_ID,
      studioId: STUDIO_ID,
      clientId: 'client-1',
      eventType: 'Wedding',
      venueLocation: 'Goa Beach Resort',
      primaryContactPerson: 'Ananya & Siddharth',
      targetAlbumDeliveryDate: '2027-02-01',
      stage: 'Booking',
      financialStatus: 'Financially Open',
      contractValuePaise: 20000000n, // ₹2,00,000
      createdAt: '2026-11-20',
    };
    await projectRepo.insert(project);

    clientPortalService = new ClientPortalService(
      linkRepo,
      projectRepo,
      async () => recordedPayments,
      async () => ({
        id: STUDIO_ID,
        name: 'Aarav Pixels',
        upiId: 'aarav@icici',
      }),
      async (sId, pId, amountPaise, payerName, utr) => {
        const result = invoicingService.recordClientClaim(
          {
            studioId: sId,
            milestoneId: MILESTONE_ID,
            amountPaise,
            payerName,
            transactionUtrRef: utr,
          },
          6000000n, // ₹60,000 milestone
          recordedPayments,
        );
        recordedPayments.push(result.payment);
      },
    );

    const link = await clientPortalService.issueLink(STUDIO_ID, PROJECT_ID);
    activeToken = link.rawToken;
  });

  // -----------------------------------------------------------
  // Positive Claim Flows
  // -----------------------------------------------------------
  describe('Client Claim Submission & Verification Status', () => {
    it('records an unverified payment claim that does NOT reduce verified pending balance', () => {
      const result = invoicingService.recordClientClaim(
        {
          studioId: STUDIO_ID,
          milestoneId: MILESTONE_ID,
          amountPaise: 3000000n, // ₹30,000 claim
          payerName: 'Siddharth',
          transactionUtrRef: 'UPI-UTR-123456789',
        },
        6000000n,
        [],
      );

      // Invariant: MUST be marked Unverified
      expect(result.payment.verificationStatus).toBe('Unverified');
      expect(result.payment.amountPaise).toBe(3000000n);

      // Verified balance remains ₹60,000 (0 verified payments received)
      expect(result.milestoneBalancePaise).toBe(6000000n);
    });

    it('submits payment claim via client portal service and updates claim log', async () => {
      const claim = await clientPortalService.submitPaymentClaim(activeToken, {
        amountPaise: 6000000n,
        payerName: 'Ananya Roy',
        transactionUtrRef: 'AXIS-UTR-554433',
      });

      expect(claim.status).toBe('Unverified');
      expect(claim.message).toBe('Payment submitted – verify & settle');
      expect(recordedPayments).toHaveLength(1);
      expect(recordedPayments[0]?.verificationStatus).toBe('Unverified');
      expect(recordedPayments[0]?.transactionUtrRef).toBe('AXIS-UTR-554433');
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 Ratio)
    // -----------------------------------------------------------
    it('rejects claim with zero amount', () => {
      expect(() =>
        invoicingService.recordClientClaim(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 0n,
            payerName: 'Siddharth',
          },
          6000000n,
          [],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects claim with negative amount', () => {
      expect(() =>
        invoicingService.recordClientClaim(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: -50000n,
            payerName: 'Siddharth',
          },
          6000000n,
          [],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects claim with empty or whitespace payerName', () => {
      expect(() =>
        invoicingService.recordClientClaim(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 500000n,
            payerName: '   ',
          },
          6000000n,
          [],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects portal submission when link has been revoked', async () => {
      const allLinks = await linkRepo.listByProject(STUDIO_ID, PROJECT_ID);
      await clientPortalService.revokeLink(STUDIO_ID, allLinks[0]!.id);

      await expect(
        clientPortalService.submitPaymentClaim(activeToken, {
          amountPaise: 1000000n,
          payerName: 'Siddharth',
        }),
      ).rejects.toThrow(ClientLinkInactiveError);
    });

    it('rejects portal submission when token is unknown or fake', async () => {
      const fakeToken = '0123456789abcdef0123456789abcdef';
      await expect(
        clientPortalService.submitPaymentClaim(fakeToken, {
          amountPaise: 1000000n,
          payerName: 'Siddharth',
        }),
      ).rejects.toThrow(ClientLinkInactiveError);
    });

    it('rejects portal submission with zero or negative amount', async () => {
      await expect(
        clientPortalService.submitPaymentClaim(activeToken, {
          amountPaise: 0n,
          payerName: 'Siddharth',
        }),
      ).rejects.toThrow(ClientPortalValidationError);

      await expect(
        clientPortalService.submitPaymentClaim(activeToken, {
          amountPaise: -100n,
          payerName: 'Siddharth',
        }),
      ).rejects.toThrow(ClientPortalValidationError);
    });
  });
});
