import { describe, expect, it } from 'vitest';
import {
  ProjectValidationError,
  autoAdjustMilestonesForPayment,
  createCustomMilestoneSchedule,
} from '../../src/modules/projects/index.js';

describe('Flexible & Auto-Adjustable Milestones (PRD FR-A-08, PR-4)', () => {
  // -----------------------------------------------------------
  // Arbitrary Cuts & Splits
  // -----------------------------------------------------------
  describe('createCustomMilestoneSchedule', () => {
    it('creates a 50/50 two-milestone schedule', () => {
      const contractValue = 20000000n; // ₹2,00,000
      const schedule = createCustomMilestoneSchedule(contractValue, [
        { name: 'Advance', percentage: 50 },
        { name: 'Final Delivery', percentage: 50 },
      ]);

      expect(schedule).toHaveLength(2);
      expect(schedule[0]?.amountPaise).toBe(10000000n);
      expect(schedule[1]?.amountPaise).toBe(10000000n);
      expect(schedule[0]!.amountPaise + schedule[1]!.amountPaise).toBe(contractValue);
    });

    it('creates a 20/30/50 three-milestone schedule', () => {
      const contractValue = 10000000n; // ₹1,00,000
      const schedule = createCustomMilestoneSchedule(contractValue, [
        { name: 'Booking Token', percentage: 20 },
        { name: 'Shoot Day', percentage: 30 },
        { name: 'Album Handover', percentage: 50 },
      ]);

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amountPaise).toBe(2000000n); // ₹20,000
      expect(schedule[1]?.amountPaise).toBe(3000000n); // ₹30,000
      expect(schedule[2]?.amountPaise).toBe(5000000n); // ₹50,000
      expect(schedule.reduce((acc, m) => acc + m.amountPaise, 0n)).toBe(contractValue);
    });

    it('creates a 4-stage 20/30/20/30 schedule', () => {
      const contractValue = 30000000n; // ₹3,00,000
      const schedule = createCustomMilestoneSchedule(contractValue, [
        { name: 'Advance', percentage: 20 },
        { name: 'Shoot Completed', percentage: 30 },
        { name: 'Digital Proofs', percentage: 20 },
        { name: 'Print & Handover', percentage: 30 },
      ]);

      expect(schedule).toHaveLength(4);
      expect(schedule[0]?.amountPaise).toBe(6000000n);
      expect(schedule[1]?.amountPaise).toBe(9000000n);
      expect(schedule[2]?.amountPaise).toBe(6000000n);
      expect(schedule[3]?.amountPaise).toBe(9000000n);
      expect(schedule.reduce((acc, m) => acc + m.amountPaise, 0n)).toBe(contractValue);
    });

    it('creates custom rupee amount splits and auto-balances the final milestone', () => {
      const contractValue = 15000000n; // ₹1,50,000
      const schedule = createCustomMilestoneSchedule(contractValue, [
        { name: 'Token', amountPaise: 2500000n }, // ₹25,000
        { name: 'Shoot', amountPaise: 5000000n }, // ₹50,000
        { name: 'Balance' }, // Should auto-balance to ₹75,000
      ]);

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amountPaise).toBe(2500000n);
      expect(schedule[1]?.amountPaise).toBe(5000000n);
      expect(schedule[2]?.amountPaise).toBe(7500000n);
      expect(schedule.reduce((acc, m) => acc + m.amountPaise, 0n)).toBe(contractValue);
    });

    it('guarantees exact integer paise sum for odd fractional divisions', () => {
      // ₹1,00,000.01 (10,000,001 paise) split 33.33% / 33.33% / remainder
      const contractValue = 10000001n;
      const schedule = createCustomMilestoneSchedule(contractValue, [
        { name: 'Part 1', percentage: 33.33 },
        { name: 'Part 2', percentage: 33.33 },
        { name: 'Part 3' },
      ]);

      const sum = schedule.reduce((acc, m) => acc + m.amountPaise, 0n);
      expect(sum).toBe(10000001n);
    });

    // Adversarial Negative Tests
    it('rejects negative contract value', () => {
      expect(() =>
        createCustomMilestoneSchedule(-5000n, [{ name: 'Advance', percentage: 100 }]),
      ).toThrow(ProjectValidationError);
    });

    it('rejects empty splits list', () => {
      expect(() => createCustomMilestoneSchedule(10000n, [])).toThrow(ProjectValidationError);
    });

    it('rejects milestone with empty name', () => {
      expect(() =>
        createCustomMilestoneSchedule(10000n, [
          { name: '', percentage: 50 },
          { name: 'Final', percentage: 50 },
        ]),
      ).toThrow(ProjectValidationError);
    });

    it('rejects percentage <= 0 or > 100', () => {
      expect(() =>
        createCustomMilestoneSchedule(10000n, [
          { name: 'M1', percentage: 0 },
          { name: 'M2', percentage: 100 },
        ]),
      ).toThrow(ProjectValidationError);

      expect(() =>
        createCustomMilestoneSchedule(10000n, [
          { name: 'M1', percentage: 150 },
          { name: 'M2', percentage: 50 },
        ]),
      ).toThrow(ProjectValidationError);
    });

    it('rejects explicit amounts exceeding contract value', () => {
      expect(() =>
        createCustomMilestoneSchedule(10000n, [
          { name: 'M1', amountPaise: 8000n },
          { name: 'M2', amountPaise: 5000n }, // Total 13k > 10k
          { name: 'M3' },
        ]),
      ).toThrow(ProjectValidationError);
    });

    it('rejects invalid calendar dates for dueDate or eventDate', () => {
      expect(() =>
        createCustomMilestoneSchedule(
          10000n,
          [{ name: 'M1', percentage: 100, dueDate: '2026-02-30' }],
        ),
      ).toThrow(ProjectValidationError);

      expect(() =>
        createCustomMilestoneSchedule(
          10000n,
          [{ name: 'M1', percentage: 100 }],
          'not-a-date',
        ),
      ).toThrow(ProjectValidationError);
    });
  });

  // -----------------------------------------------------------
  // Auto-Rebalancing for Ad-Hoc Payments
  // -----------------------------------------------------------
  describe('autoAdjustMilestonesForPayment', () => {
    it('absorbs client surplus and reduces future scheduled milestone', () => {
      // 3 milestones: 30k, 40k, 30k (total 100k)
      const milestones = [
        { id: 'm1', projectId: 'p1', name: 'Advance', percentage: 30, amountPaise: 3000000n, dueDate: null },
        { id: 'm2', projectId: 'p1', name: 'Shoot', percentage: 40, amountPaise: 4000000n, dueDate: null },
        { id: 'm3', projectId: 'p1', name: 'Delivery', percentage: 30, amountPaise: 3000000n, dueDate: null },
      ];

      // Client pays ₹40,000 on m1 (+₹10,000 surplus)
      const { adjustedMilestones, targetDeltaPaise } = autoAdjustMilestonesForPayment(
        milestones,
        4000000n,
        'm1',
      );

      expect(targetDeltaPaise).toBe(1000000n);
      expect(adjustedMilestones[0]?.amountPaise).toBe(4000000n); // m1 becomes 40k
      expect(adjustedMilestones[1]?.amountPaise).toBe(3000000n); // m2 reduced from 40k to 30k
      expect(adjustedMilestones[2]?.amountPaise).toBe(3000000n); // m3 stays 30k

      // Contract total remains exactly 100k
      const total = adjustedMilestones.reduce((acc, m) => acc + m.amountPaise, 0n);
      expect(total).toBe(10000000n);
    });

    it('carries forward client deficit to the next scheduled milestone', () => {
      const milestones = [
        { id: 'm1', projectId: 'p1', name: 'Advance', percentage: 30, amountPaise: 3000000n, dueDate: null },
        { id: 'm2', projectId: 'p1', name: 'Shoot', percentage: 40, amountPaise: 4000000n, dueDate: null },
        { id: 'm3', projectId: 'p1', name: 'Delivery', percentage: 30, amountPaise: 3000000n, dueDate: null },
      ];

      // Client only had ₹15,000 available at booking (-₹15,000 shortfall)
      const { adjustedMilestones, targetDeltaPaise } = autoAdjustMilestonesForPayment(
        milestones,
        1500000n,
        'm1',
      );

      expect(targetDeltaPaise).toBe(-1500000n);
      expect(adjustedMilestones[0]?.amountPaise).toBe(1500000n); // m1 set to 15k
      expect(adjustedMilestones[1]?.amountPaise).toBe(5500000n); // m2 increased from 40k to 55k (absorbs shortfall)
      expect(adjustedMilestones[2]?.amountPaise).toBe(3000000n); // m3 unchanged

      // Total still exactly 100k
      const total = adjustedMilestones.reduce((acc, m) => acc + m.amountPaise, 0n);
      expect(total).toBe(10000000n);
    });

    // Adversarial Negative Tests
    it('rejects auto-adjust with negative or zero payment amount', () => {
      const milestones = [
        { id: 'm1', projectId: 'p1', name: 'M1', percentage: 100, amountPaise: 10000n, dueDate: null },
      ];

      expect(() => autoAdjustMilestonesForPayment(milestones, 0n, 'm1')).toThrow(
        ProjectValidationError,
      );
      expect(() => autoAdjustMilestonesForPayment(milestones, -100n, 'm1')).toThrow(
        ProjectValidationError,
      );
    });

    it('rejects auto-adjust when target milestone is not found in schedule', () => {
      const milestones = [
        { id: 'm1', projectId: 'p1', name: 'M1', percentage: 100, amountPaise: 10000n, dueDate: null },
      ];

      expect(() => autoAdjustMilestonesForPayment(milestones, 5000n, 'unknown-id')).toThrow(
        ProjectValidationError,
      );
    });
  });
});
