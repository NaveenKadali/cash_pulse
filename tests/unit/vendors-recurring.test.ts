import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryRecurringExpenseRepository,
  RecurringExpenseNotFoundError,
  RecurringExpenseService,
  RecurringExpenseValidationError,
  expandRecurringInstances,
  validateDayOfMonth,
} from '../../src/modules/vendors/index.js';

describe('Recurring Expenses (PRD FR-B-04, LLD §3.10)', () => {
  const STUDIO_ID = '00000000-0000-0000-0000-000000000001';
  const OTHER_STUDIO_ID = '00000000-0000-0000-0000-000000000002';

  let repo: InMemoryRecurringExpenseRepository;
  let service: RecurringExpenseService;

  beforeEach(() => {
    repo = new InMemoryRecurringExpenseRepository();
    service = new RecurringExpenseService(repo);
  });

  // -----------------------------------------------------------
  // Pure Day-of-Month & Recurrence Invariants
  // -----------------------------------------------------------
  describe('validateDayOfMonth', () => {
    it('accepts valid calendar days 1 through 28', () => {
      expect(() => validateDayOfMonth(1)).not.toThrow();
      expect(() => validateDayOfMonth(15)).not.toThrow();
      expect(() => validateDayOfMonth(28)).not.toThrow();
    });

    // Adversarial Negative Tests for dayOfMonth
    it('rejects 0', () => {
      expect(() => validateDayOfMonth(0)).toThrow(RecurringExpenseValidationError);
    });

    it('rejects 29 (to avoid month-end ambiguity per LLD §3.10)', () => {
      expect(() => validateDayOfMonth(29)).toThrow(RecurringExpenseValidationError);
    });

    it('rejects 30 and 31', () => {
      expect(() => validateDayOfMonth(30)).toThrow(RecurringExpenseValidationError);
      expect(() => validateDayOfMonth(31)).toThrow(RecurringExpenseValidationError);
    });

    it('rejects negative day numbers', () => {
      expect(() => validateDayOfMonth(-5)).toThrow(RecurringExpenseValidationError);
    });

    it('rejects floating point day numbers', () => {
      expect(() => validateDayOfMonth(15.5)).toThrow(RecurringExpenseValidationError);
    });
  });

  describe('expandRecurringInstances', () => {
    it('expands occurrences strictly within the expense validity window and forecast horizon', () => {
      const expense = {
        id: 'exp-1',
        studioId: STUDIO_ID,
        name: 'Adobe Creative Cloud',
        amountPaise: 400000n, // ₹4,000
        dayOfMonth: 5,
        startDate: '2026-10-01',
        endDate: '2027-01-31',
        category: 'software_tool',
        createdAt: '2026-10-01',
      };

      // Horizon from 2026-11-01 to 2027-01-10
      const occurrences = expandRecurringInstances(expense, '2026-11-01', '2027-01-10');

      expect(occurrences).toHaveLength(3);
      expect(occurrences[0]?.date).toBe('2026-11-05');
      expect(occurrences[0]?.amountPaise).toBe(400000n);
      expect(occurrences[1]?.date).toBe('2026-12-05');
      expect(occurrences[2]?.date).toBe('2027-01-05');
    });

    it('omits occurrences falling outside expense endDate', () => {
      const expense = {
        id: 'exp-2',
        studioId: STUDIO_ID,
        name: 'Studio Rent EMI',
        amountPaise: 2500000n, // ₹25,000
        dayOfMonth: 10,
        startDate: '2026-01-01',
        endDate: '2026-11-15', // ends mid-November
        createdAt: '2026-01-01',
      };

      const occurrences = expandRecurringInstances(expense, '2026-11-01', '2026-12-31');
      // Should include 2026-11-10, but NOT 2026-12-10
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0]?.date).toBe('2026-11-10');
    });

    // Adversarial Negative Tests
    it('rejects expansion when horizonStart has invalid calendar format', () => {
      const expense = {
        id: 'exp-1',
        studioId: STUDIO_ID,
        name: 'Tool',
        amountPaise: 1000n,
        dayOfMonth: 10,
        startDate: '2026-01-01',
        endDate: null,
        createdAt: '2026-01-01',
      };

      expect(() => expandRecurringInstances(expense, 'not-a-date', '2026-12-31')).toThrow(
        RecurringExpenseValidationError,
      );
    });

    it('rejects expansion when horizonStart is after horizonEnd', () => {
      const expense = {
        id: 'exp-1',
        studioId: STUDIO_ID,
        name: 'Tool',
        amountPaise: 1000n,
        dayOfMonth: 10,
        startDate: '2026-01-01',
        endDate: null,
        createdAt: '2026-01-01',
      };

      expect(() => expandRecurringInstances(expense, '2026-12-31', '2026-11-01')).toThrow(
        RecurringExpenseValidationError,
      );
    });
  });

  // -----------------------------------------------------------
  // Service CRUD & Validation
  // -----------------------------------------------------------
  describe('RecurringExpenseService', () => {
    it('creates and lists recurring expenses for a studio', async () => {
      const created = await service.create({
        studioId: STUDIO_ID,
        name: 'Storage Cloud Drive',
        amountPaise: 150000n, // ₹1,500
        dayOfMonth: 15,
        startDate: '2026-11-01',
        category: 'software_tool',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Storage Cloud Drive');
      expect(created.amountPaise).toBe(150000n);
      expect(created.dayOfMonth).toBe(15);
      expect(created.startDate).toBe('2026-11-01');
      expect(created.endDate).toBeNull();

      const list = await service.list(STUDIO_ID);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(created.id);
    });

    it('updates an existing recurring expense', async () => {
      const exp = await service.create({
        studioId: STUDIO_ID,
        name: 'Studio Internet',
        amountPaise: 200000n,
        dayOfMonth: 1,
        startDate: '2026-01-01',
      });

      const updated = await service.update(STUDIO_ID, exp.id, {
        name: 'Studio Fiber 300Mbps',
        amountPaise: 250000n,
        dayOfMonth: 5,
        endDate: '2027-12-31',
      });

      expect(updated.name).toBe('Studio Fiber 300Mbps');
      expect(updated.amountPaise).toBe(250000n);
      expect(updated.dayOfMonth).toBe(5);
      expect(updated.endDate).toBe('2027-12-31');
    });

    it('deletes an existing recurring expense', async () => {
      const exp = await service.create({
        studioId: STUDIO_ID,
        name: 'Temporary Subscription',
        amountPaise: 50000n,
        dayOfMonth: 10,
        startDate: '2026-01-01',
      });

      await service.delete(STUDIO_ID, exp.id);
      const list = await service.list(STUDIO_ID);
      expect(list).toHaveLength(0);
    });

    // Adversarial Negative Tests
    it('rejects creation when studioId is missing', async () => {
      await expect(
        service.create({
          studioId: '',
          name: 'SaaS',
          amountPaise: 1000n,
          dayOfMonth: 10,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects creation when name is empty', async () => {
      await expect(
        service.create({
          studioId: STUDIO_ID,
          name: '   ',
          amountPaise: 1000n,
          dayOfMonth: 10,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects creation when amount is zero', async () => {
      await expect(
        service.create({
          studioId: STUDIO_ID,
          name: 'SaaS',
          amountPaise: 0n,
          dayOfMonth: 10,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects creation when amount is negative', async () => {
      await expect(
        service.create({
          studioId: STUDIO_ID,
          name: 'SaaS',
          amountPaise: -1000n,
          dayOfMonth: 10,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects creation when startDate calendar format is invalid', async () => {
      await expect(
        service.create({
          studioId: STUDIO_ID,
          name: 'SaaS',
          amountPaise: 1000n,
          dayOfMonth: 10,
          startDate: '2026-02-30', // invalid date
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects creation when endDate is before startDate', async () => {
      await expect(
        service.create({
          studioId: STUDIO_ID,
          name: 'SaaS',
          amountPaise: 1000n,
          dayOfMonth: 10,
          startDate: '2026-05-01',
          endDate: '2026-04-30', // earlier
        }),
      ).rejects.toThrow(RecurringExpenseValidationError);
    });

    it('rejects update for non-existent expense', async () => {
      await expect(
        service.update(STUDIO_ID, 'non-existent-id', {
          name: 'New Name',
        }),
      ).rejects.toThrow(RecurringExpenseNotFoundError);
    });

    it('rejects delete for non-existent expense', async () => {
      await expect(service.delete(STUDIO_ID, 'non-existent-id')).rejects.toThrow(
        RecurringExpenseNotFoundError,
      );
    });

    it('rejects delete for expense belonging to another studio (tenancy protection)', async () => {
      const exp = await service.create({
        studioId: STUDIO_ID,
        name: 'Private Expense',
        amountPaise: 1000n,
        dayOfMonth: 10,
        startDate: '2026-01-01',
      });

      await expect(service.delete(OTHER_STUDIO_ID, exp.id)).rejects.toThrow(
        RecurringExpenseNotFoundError,
      );
    });
  });
});
