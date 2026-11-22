import { describe, expect, it } from 'vitest';
import { paise } from '../../src/infrastructure/money.js';
import {
  deriveFinancialStatus,
  InMemoryProjectRepository,
  InvalidStageTransitionError,
  ProjectPlanLimitError,
  ProjectService,
  ProjectValidationError,
  resolveEffectiveStage,
  validateEventType,
  validateStageTransition,
} from '../../src/modules/projects/index.js';

describe('Project Lifecycle & State Machine (PR-2, PR-5)', () => {
  const createService = () => new ProjectService(new InMemoryProjectRepository());

  // Advances a project one stage at a time to the requested stage (sequential rule).
  const STAGE_PATH = [
    'Vendor Setup',
    'Shoot Completed',
    'Digital Proofs Ready',
    'Album Layout Approved',
    'Print & Delivered',
  ] as const;
  const advanceTo = async (
    service: ProjectService,
    studioId: string,
    projectId: string,
    stage: (typeof STAGE_PATH)[number],
  ) => {
    for (const next of STAGE_PATH) {
      await service.advanceStage(studioId, projectId, next);
      if (next === stage) return;
    }
  };

  // -------------------------------------------------------------
  // Canonical Event Types (PRD FR-A-01, ADR-003)
  // -------------------------------------------------------------
  describe('Event Type Validation', () => {
    it('accepts all canonical event types', () => {
      const canonical = [
        'Wedding',
        'Pre-Wedding',
        'Engagement',
        'Birthday',
        'Corporate',
        'Anniversary',
        'Other',
      ];
      for (const t of canonical) {
        expect(validateEventType(t)).toBe(t);
      }
    });

    it('rejects unapproved event types', () => {
      expect(() => validateEventType('Concert')).toThrow(ProjectValidationError);
      expect(() => validateEventType('party')).toThrow(ProjectValidationError);
      expect(() => validateEventType('')).toThrow(ProjectValidationError);
    });
  });

  // -------------------------------------------------------------
  // Seven-Stage Workflow & Stage 7 Invariant (HLD §11c, ADR-003)
  // -------------------------------------------------------------
  describe('Stage Transitions and Invariants', () => {
    it('allows a forward single step (Booking -> Vendor Setup)', () => {
      expect(() => validateStageTransition('Booking', 'Vendor Setup')).not.toThrow();
    });

    it('rejects skipping forward (Booking -> Shoot Completed)', () => {
      expect(() => validateStageTransition('Booking', 'Shoot Completed')).toThrow(
        InvalidStageTransitionError,
      );
    });

    it('allows a backward single step with a non-empty note', () => {
      expect(() =>
        validateStageTransition('Vendor Setup', 'Booking', 'client rescheduled'),
      ).not.toThrow();
    });

    it('rejects a backward move without notes', () => {
      expect(() => validateStageTransition('Vendor Setup', 'Booking')).toThrow(
        InvalidStageTransitionError,
      );
      expect(() => validateStageTransition('Vendor Setup', 'Booking', null)).toThrow(
        InvalidStageTransitionError,
      );
    });

    it('rejects a backward move with whitespace-only notes', () => {
      expect(() => validateStageTransition('Vendor Setup', 'Booking', '   ')).toThrow(
        InvalidStageTransitionError,
      );
    });

    it('rejects a backward skip even with notes (Shoot Completed -> Booking)', () => {
      expect(() =>
        validateStageTransition('Shoot Completed', 'Booking', 'client rescheduled'),
      ).toThrow(InvalidStageTransitionError);
    });

    it('rejects manual transition to Financial Closed', () => {
      expect(() => validateStageTransition('Print & Delivered', 'Financial Closed')).toThrow(
        InvalidStageTransitionError,
      );
      expect(() => validateStageTransition('Booking', 'Financial Closed')).toThrow(
        InvalidStageTransitionError,
      );
    });

    it('rejects manual transition from Financial Closed', () => {
      expect(() =>
        validateStageTransition('Financial Closed', 'Print & Delivered', 'reopen'),
      ).toThrow(InvalidStageTransitionError);
    });

    it('rejects same-stage transition', () => {
      expect(() => validateStageTransition('Booking', 'Booking')).toThrow(
        InvalidStageTransitionError,
      );
    });
  });

  // -------------------------------------------------------------
  // Financial Status Derivation (PRD FR-E-04)
  // -------------------------------------------------------------
  describe('Financial Status Derivation', () => {
    it('derives Financially Open when nothing is paid', () => {
      expect(deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 0n })).toBe(
        'Financially Open',
      );
    });

    it('derives Partially Settled when paid is between 0 and contract', () => {
      expect(deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 40n })).toBe(
        'Partially Settled',
      );
    });

    it('derives Financially Closed when paid equals contract', () => {
      expect(deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 100n })).toBe(
        'Financially Closed',
      );
    });

    it('derives Financially Closed for zero contract with zero payment (balance rule wins)', () => {
      expect(deriveFinancialStatus({ contractPaise: 0n, verifiedPaidPaise: 0n })).toBe(
        'Financially Closed',
      );
    });

    it('gives the same result for number and bigint inputs', () => {
      expect(deriveFinancialStatus({ contractPaise: 100, verifiedPaidPaise: 0 })).toBe(
        deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 0n }),
      );
      expect(deriveFinancialStatus({ contractPaise: 100, verifiedPaidPaise: 40 })).toBe(
        deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 40n }),
      );
      expect(deriveFinancialStatus({ contractPaise: 100, verifiedPaidPaise: 100 })).toBe(
        deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 100n }),
      );
    });

    it('throws when paid exceeds contract', () => {
      expect(() => deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: 101n })).toThrow(
        ProjectValidationError,
      );
    });

    it('throws on negative contract or paid values', () => {
      expect(() => deriveFinancialStatus({ contractPaise: -1n, verifiedPaidPaise: 0n })).toThrow(
        ProjectValidationError,
      );
      expect(() => deriveFinancialStatus({ contractPaise: 100n, verifiedPaidPaise: -1n })).toThrow(
        ProjectValidationError,
      );
      expect(() => deriveFinancialStatus({ contractPaise: -1, verifiedPaidPaise: 0 })).toThrow(
        ProjectValidationError,
      );
    });
  });

  // -------------------------------------------------------------
  // Automatic Stage 7 Resolution
  // -------------------------------------------------------------
  describe('Automatic Stage 7 Resolution', () => {
    it('automatically resolves to Financial Closed when Print & Delivered AND Financially Closed', () => {
      const effective = resolveEffectiveStage('Print & Delivered', 'Financially Closed');
      expect(effective).toBe('Financial Closed');
    });

    it('does not resolve to Financial Closed if deliverables are not yet Print & Delivered', () => {
      const effective = resolveEffectiveStage('Album Layout Approved', 'Financially Closed');
      expect(effective).toBe('Album Layout Approved');
    });

    it('does not resolve to Financial Closed if financial status is not Financially Closed', () => {
      const effective = resolveEffectiveStage('Print & Delivered', 'Partially Settled');
      expect(effective).toBe('Print & Delivered');
    });
  });

  // -------------------------------------------------------------
  // Project Service Integration & Plan Limits (HLD §8.8)
  // -------------------------------------------------------------
  describe('Project Service Operations & Plan Limits', () => {
    it('creates project with default Booking stage and Financially Open status', async () => {
      const service = createService();
      const project = await service.createProject({
        studioId: 'studio-1',
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Pooja Verma',
        contractValuePaise: paise(8000000n),
      });

      expect(project.id).toMatch(/^proj-/);
      expect(project.stage).toBe('Booking');
      expect(project.financialStatus).toBe('Financially Open');
      expect(project.eventType).toBe('Wedding');
    });

    it('advances stages sequentially through service', async () => {
      const service = createService();
      const project = await service.createProject({
        studioId: 'studio-1',
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Pooja Verma',
        contractValuePaise: paise(8000000n),
      });

      const updated = await service.advanceStage('studio-1', project.id, 'Vendor Setup');
      expect(updated.stage).toBe('Vendor Setup');

      const updated2 = await service.advanceStage('studio-1', project.id, 'Shoot Completed');
      expect(updated2.stage).toBe('Shoot Completed');
    });

    it('rejects skipping stages through service', async () => {
      const service = createService();
      const project = await service.createProject({
        studioId: 'studio-1',
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Pooja Verma',
        contractValuePaise: paise(8000000n),
      });

      await expect(
        service.advanceStage('studio-1', project.id, 'Shoot Completed'),
      ).rejects.toThrow(InvalidStageTransitionError);
    });

    it('automatically transitions to Stage 7 when syncFinancialStatus satisfies both conditions', async () => {
      const service = createService();
      const project = await service.createProject({
        studioId: 'studio-1',
        clientId: 'client-1',
        eventType: 'Wedding',
        primaryContactPerson: 'Pooja Verma',
        contractValuePaise: paise(8000000n),
      });

      // Advance sequentially to stage 6 Print & Delivered
      await advanceTo(service, 'studio-1', project.id, 'Print & Delivered');

      // Now sync full payment
      const settled = await service.syncFinancialStatus('studio-1', project.id, paise(8000000n));
      expect(settled.financialStatus).toBe('Financially Closed');
      expect(settled.stage).toBe('Financial Closed');
    });

    it('enforces maximum 3 active projects on Free plan', async () => {
      const service = createService();

      // Create 3 active projects
      for (let i = 1; i <= 3; i++) {
        await service.createProject(
          {
            studioId: 'studio-free',
            clientId: `client-${i}`,
            eventType: 'Engagement',
            primaryContactPerson: `Contact ${i}`,
            contractValuePaise: paise(5000000n),
          },
          'Free',
        );
      }

      // 4th project must be rejected with PLAN_LIMIT
      await expect(
        service.createProject(
          {
            studioId: 'studio-free',
            clientId: 'client-4',
            eventType: 'Birthday',
            primaryContactPerson: 'Contact 4',
            contractValuePaise: paise(5000000n),
          },
          'Free',
        ),
      ).rejects.toThrow(ProjectPlanLimitError);
    });

    it('allows 4th project if one of previous 3 is Financially Closed', async () => {
      const service = createService();

      const p1 = await service.createProject(
        {
          studioId: 'studio-free',
          clientId: 'client-1',
          eventType: 'Engagement',
          primaryContactPerson: 'Contact 1',
          contractValuePaise: paise(5000000n),
        },
        'Free',
      );

      for (let i = 2; i <= 3; i++) {
        await service.createProject(
          {
            studioId: 'studio-free',
            clientId: `client-${i}`,
            eventType: 'Engagement',
            primaryContactPerson: `Contact ${i}`,
            contractValuePaise: paise(5000000n),
          },
          'Free',
        );
      }

      // Close p1 (sequential advance, then full payment)
      await advanceTo(service, 'studio-free', p1.id, 'Print & Delivered');
      await service.syncFinancialStatus('studio-free', p1.id, paise(5000000n));

      // 4th project should now succeed because active count dropped to 2
      await expect(
        service.createProject(
          {
            studioId: 'studio-free',
            clientId: 'client-4',
            eventType: 'Birthday',
            primaryContactPerson: 'Contact 4',
            contractValuePaise: paise(5000000n),
          },
          'Free',
        ),
      ).resolves.toBeDefined();
    });

    it('allows more than 3 active projects on Starter plan', async () => {
      const service = createService();

      for (let i = 1; i <= 5; i++) {
        await expect(
          service.createProject(
            {
              studioId: 'studio-starter',
              clientId: `client-${i}`,
              eventType: 'Corporate',
              primaryContactPerson: `Contact ${i}`,
              contractValuePaise: paise(5000000n),
            },
            'Starter',
          ),
        ).resolves.toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------
  // Adversarial & Negative Validations (2:1 Ratio Standard)
  // -------------------------------------------------------------
  describe('Adversarial & Boundary Validations', () => {
    it('rejects project creation with missing studioId', async () => {
      const service = createService();
      await expect(
        service.createProject({
          studioId: '',
          clientId: 'c1',
          eventType: 'Wedding',
          primaryContactPerson: 'Person',
          contractValuePaise: paise(1000n),
        }),
      ).rejects.toThrow(ProjectValidationError);
    });

    it('rejects project creation with missing clientId', async () => {
      const service = createService();
      await expect(
        service.createProject({
          studioId: 's1',
          clientId: '',
          eventType: 'Wedding',
          primaryContactPerson: 'Person',
          contractValuePaise: paise(1000n),
        }),
      ).rejects.toThrow(ProjectValidationError);
    });

    it('rejects project creation with empty primary contact person', async () => {
      const service = createService();
      await expect(
        service.createProject({
          studioId: 's1',
          clientId: 'c1',
          eventType: 'Wedding',
          primaryContactPerson: '   ',
          contractValuePaise: paise(1000n),
        }),
      ).rejects.toThrow(ProjectValidationError);
    });

    it('rejects project creation with negative contract value', async () => {
      const service = createService();
      await expect(
        service.createProject({
          studioId: 's1',
          clientId: 'c1',
          eventType: 'Wedding',
          primaryContactPerson: 'Person',
          contractValuePaise: paise(-1000n),
        }),
      ).rejects.toThrow(ProjectValidationError);
    });

    it('rejects project creation with invalid targetAlbumDeliveryDate', async () => {
      const service = createService();
      await expect(
        service.createProject({
          studioId: 's1',
          clientId: 'c1',
          eventType: 'Wedding',
          primaryContactPerson: 'Person',
          contractValuePaise: paise(1000n),
          targetAlbumDeliveryDate: '2026-02-30', // Non-existent date
        }),
      ).rejects.toThrow(ProjectValidationError);
    });
  });
});
