import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryProjectRepository,
  InMemoryStageChangeRepository,
  InvalidStageTransitionError,
  ProjectNotFoundError,
  ProjectService,
  ProjectValidationError,
  calculateProjectContribution,
  computeProjectFinancialSummary,
  isDeliverableHoldActive,
} from '../../src/modules/projects/index.js';

describe('Project Financial Summary & Stage Audit Log (PRD FR-C-01, FR-E-02, FR-E-03, PR-3, PR-7)', () => {
  const STUDIO_ID = '00000000-0000-0000-0000-000000000001';
  const OTHER_STUDIO_ID = '00000000-0000-0000-0000-000000000002';

  let projectRepo: InMemoryProjectRepository;
  let stageRepo: InMemoryStageChangeRepository;
  let service: ProjectService;

  beforeEach(() => {
    projectRepo = new InMemoryProjectRepository();
    stageRepo = new InMemoryStageChangeRepository();
    service = new ProjectService(projectRepo, stageRepo);
  });

  // -----------------------------------------------------------
  // Pure Contribution & Margin Calculations (PRD FR-C-01, §7)
  // -----------------------------------------------------------
  describe('calculateProjectContribution', () => {
    it('uses actual vendor costs when recorded', () => {
      // Contract ₹2,50,000, Actual Costs ₹90,000, Estimated ₹80,000
      const result = calculateProjectContribution(25000000n, 9000000n, 8000000n);

      expect(result.effectiveCostsPaise).toBe(9000000n);
      expect(result.expectedContributionPaise).toBe(16000000n); // ₹1,60,000
      expect(result.retentionPercentage).toBe(64); // 64%
    });

    it('falls back to estimated vendor costs when actual costs are zero', () => {
      // Contract ₹1,00,000, Actual Costs 0, Estimated ₹35,000
      const result = calculateProjectContribution(10000000n, 0n, 3500000n);

      expect(result.effectiveCostsPaise).toBe(3500000n);
      expect(result.expectedContributionPaise).toBe(6500000n); // ₹65,000
      expect(result.retentionPercentage).toBe(65); // 65%
    });

    it('returns null retention percentage when contract value is zero', () => {
      const result = calculateProjectContribution(0n, 0n, 0n);
      expect(result.retentionPercentage).toBeNull();
      expect(result.expectedContributionPaise).toBe(0n);
    });

    // Adversarial Negative Tests
    it('rejects negative contract value', () => {
      expect(() => calculateProjectContribution(-1000n, 500n)).toThrow(
        ProjectValidationError,
      );
    });

    it('rejects negative actual costs', () => {
      expect(() => calculateProjectContribution(10000n, -500n)).toThrow(
        ProjectValidationError,
      );
    });

    it('rejects negative estimated costs', () => {
      expect(() => calculateProjectContribution(10000n, 0n, -500n)).toThrow(
        ProjectValidationError,
      );
    });
  });

  // -----------------------------------------------------------
  // Deliverable Hold Logic (PRD FR-E-03)
  // -----------------------------------------------------------
  describe('isDeliverableHoldActive', () => {
    it('activates hold when pending balance > 0 and stage is past Digital Proofs Ready', () => {
      expect(isDeliverableHoldActive('Digital Proofs Ready', 50000n)).toBe(true);
      expect(isDeliverableHoldActive('Album Layout Approved', 50000n)).toBe(true);
      expect(isDeliverableHoldActive('Print & Delivered', 50000n)).toBe(true);
    });

    // Adversarial Negative Tests
    it('does NOT activate hold when pending client balance is zero', () => {
      expect(isDeliverableHoldActive('Album Layout Approved', 0n)).toBe(false);
      expect(isDeliverableHoldActive('Print & Delivered', -100n)).toBe(false);
    });

    it('does NOT activate hold during early production stages even if balance > 0', () => {
      expect(isDeliverableHoldActive('Booking', 100000n)).toBe(false);
      expect(isDeliverableHoldActive('Vendor Setup', 100000n)).toBe(false);
      expect(isDeliverableHoldActive('Shoot Completed', 100000n)).toBe(false);
    });

    it('does NOT activate hold when hold policy is explicitly disabled', () => {
      expect(isDeliverableHoldActive('Album Layout Approved', 50000n, false)).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // computeProjectFinancialSummary
  // -----------------------------------------------------------
  describe('computeProjectFinancialSummary', () => {
    it('computes complete project financial summary matching FR-C-01', () => {
      const summary = computeProjectFinancialSummary({
        projectId: 'proj-1',
        contractValuePaise: 20000000n, // ₹2,00,000
        totalInvoicedPaise: 20000000n,
        verifiedCollectedPaise: 12000000n, // ₹1,20,000
        unverifiedCollectedPaise: 2000000n, // ₹20,000
        actualVendorCostsPaise: 6000000n, // ₹60,000
        estimatedVendorCostsPaise: 5500000n,
        stage: 'Album Layout Approved',
        financialStatus: 'Partially Settled',
      });

      expect(summary.projectId).toBe('proj-1');
      expect(summary.contractValuePaise).toBe(20000000n);
      expect(summary.verifiedCollectedPaise).toBe(12000000n);
      expect(summary.unverifiedCollectedPaise).toBe(2000000n);
      expect(summary.pendingClientBalancePaise).toBe(6000000n); // 200k - (120k + 20k) = 60k
      expect(summary.actualVendorCostsPaise).toBe(6000000n);
      expect(summary.expectedContributionPaise).toBe(14000000n); // 200k - 60k = 140k
      expect(summary.retentionPercentage).toBe(70); // 70%
      expect(summary.isDeliverableHold).toBe(true); // balance 60k > 0 at Album Layout
    });
  });

  // -----------------------------------------------------------
  // Stage Change Audit Log (PRD FR-E-02, PR-3)
  // -----------------------------------------------------------
  describe('Stage Audit Logging (advanceStage & StageChangeRepository)', () => {
    it('appends an audit log entry on every valid stage advancement', async () => {
      const project = await service.createProject({
        studioId: STUDIO_ID,
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Rohan',
        contractValuePaise: 15000000n,
      });

      // Advance from Booking -> Vendor Setup
      await service.advanceStage(
        STUDIO_ID,
        project.id,
        'Vendor Setup',
        'user-owner-1',
        'Assigned second shooter and drone pilot',
      );

      // Advance from Vendor Setup -> Shoot Completed
      await service.advanceStage(
        STUDIO_ID,
        project.id,
        'Shoot Completed',
        'user-shooter-2',
        'Completed 3-day shoot in Udaipur',
      );

      const history = await service.getStageHistory(project.id);
      expect(history).toHaveLength(2);

      expect(history[0]?.fromStage).toBe('Booking');
      expect(history[0]?.toStage).toBe('Vendor Setup');
      expect(history[0]?.changedBy).toBe('user-owner-1');
      expect(history[0]?.notes).toBe('Assigned second shooter and drone pilot');

      expect(history[1]?.fromStage).toBe('Vendor Setup');
      expect(history[1]?.toStage).toBe('Shoot Completed');
      expect(history[1]?.changedBy).toBe('user-shooter-2');
      expect(history[1]?.notes).toBe('Completed 3-day shoot in Udaipur');
    });

    // Adversarial Negative Tests
    it('rejects stage advance for non-existent project', async () => {
      await expect(
        service.advanceStage(STUDIO_ID, 'fake-id', 'Vendor Setup'),
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it('rejects stage advance for project of another studio (tenancy protection)', async () => {
      const project = await service.createProject({
        studioId: STUDIO_ID,
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Rohan',
        contractValuePaise: 10000000n,
      });

      await expect(
        service.advanceStage(OTHER_STUDIO_ID, project.id, 'Vendor Setup'),
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it('rejects moving backward in stage', async () => {
      const project = await service.createProject({
        studioId: STUDIO_ID,
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Rohan',
        contractValuePaise: 10000000n,
      });

      await service.advanceStage(STUDIO_ID, project.id, 'Vendor Setup');

      await expect(
        service.advanceStage(STUDIO_ID, project.id, 'Booking'),
      ).rejects.toThrow(InvalidStageTransitionError);
    });

    it('rejects manual transition to Financial Closed (Stage 7)', async () => {
      const project = await service.createProject({
        studioId: STUDIO_ID,
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Rohan',
        contractValuePaise: 10000000n,
      });

      await expect(
        service.advanceStage(STUDIO_ID, project.id, 'Financial Closed'),
      ).rejects.toThrow(InvalidStageTransitionError);
    });
  });
});
