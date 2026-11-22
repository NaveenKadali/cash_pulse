import { describe, expect, it } from 'vitest';
import { paise } from '../../src/infrastructure/money.js';
import {
  compareForecastScenarios,
  computeRunway,
  PlanLimitError,
  ValidationError,
  type ForecastInput,
} from '../../src/modules/forecast/index.js';

describe('Cash-Flow Forecast Engine', () => {
  // -------------------------------------------------------------
  // LLD-001 §6: Worked Example (Aarav Pixels seed)
  // -------------------------------------------------------------
  describe('LLD-001 §6 Worked Example', () => {
    const baseOpeningBalance = {
      asOfDate: '2026-03-01', // Day 0
      amountPaise: paise(2400000n), // ₹24,000
    };

    it('calculates the exact balance timeline when Verma collection occurs on Day 10', () => {
      const input: ForecastInput = {
        studioId: 'studio-aarav',
        plan: 'Starter',
        horizonDays: 14,
        openingBalance: baseOpeningBalance,
        inflows: [
          {
            id: 'milestone-verma',
            projectId: 'proj-verma',
            projectName: 'Verma Wedding',
            expectedDate: '2026-03-11', // Day 10 (2026-03-01 + 10 days)
            amountPaise: paise(4500000n), // ₹45,000
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'bill-print-lab',
            category: 'Print Lab',
            dueDate: '2026-03-15', // Day 14 (2026-03-01 + 14 days)
            amountPaise: paise(7000000n), // ₹70,000
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);

      // Verify Day 0 to 9 balance is ₹24,000 (2,400,000 paise)
      for (let d = 0; d <= 9; d++) {
        expect(result.days[d]?.balancePaise).toBe(2400000n);
      }

      // Verify Day 10 to 13 balance is ₹69,000 (6,900,000 paise)
      for (let d = 10; d <= 13; d++) {
        expect(result.days[d]?.balancePaise).toBe(6900000n);
      }

      // Day 14 balance is -₹1,000 (-100,000 paise)
      expect(result.days[14]?.balancePaise).toBe(-100000n);
      expect(result.lowestBalancePaise).toBe(-100000n);
      expect(result.lowestBalanceDate).toBe('2026-03-15');

      // Shortfall detected on Day 14
      expect(result.shortfalls).toHaveLength(1);
      const sf = result.shortfalls[0]!;
      expect(sf.shortfallDate).toBe('2026-03-15');
      expect(sf.shortfallPaise).toBe(100000n); // Deficit of ₹1,000
    });

    it('calculates the exact balance timeline when Verma collection is NOT made by Day 14', () => {
      const input: ForecastInput = {
        studioId: 'studio-aarav',
        plan: 'Starter',
        horizonDays: 14,
        openingBalance: baseOpeningBalance,
        inflows: [], // No Verma collection
        outflows: [
          {
            id: 'bill-print-lab',
            category: 'Print Lab',
            dueDate: '2026-03-15', // Day 14
            amountPaise: paise(7000000n), // ₹70,000
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);

      // Day 14 balance is -₹46,000 (-4,600,000 paise)
      expect(result.days[14]?.balancePaise).toBe(-4600000n);
      expect(result.lowestBalancePaise).toBe(-4600000n);
      expect(result.lowestBalanceDate).toBe('2026-03-15');
      expect(result.shortfalls).toHaveLength(1);
      expect(result.shortfalls[0]?.shortfallPaise).toBe(4600000n); // Deficit of ₹46,000
    });

    it('correctly attributes Verma collection as collision candidate covering ₹45,000 of ₹46,000 deficit', () => {
      // Inflow on day 10, outflow on day 14
      const input: ForecastInput = {
        studioId: 'studio-aarav',
        plan: 'Starter',
        horizonDays: 14,
        openingBalance: baseOpeningBalance,
        inflows: [
          {
            id: 'verma-collection',
            projectId: 'proj-verma',
            expectedDate: '2026-03-11', // Day 10 <= Day 14
            amountPaise: paise(4500000n), // ₹45,000
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'lab-bill',
            dueDate: '2026-03-15', // Day 14
            amountPaise: paise(7000000n), // ₹70,000
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);
      expect(result.shortfalls).toHaveLength(1);
      const sf = result.shortfalls[0]!;

      // Shortfall of 1,000 paise remaining
      expect(sf.shortfallPaise).toBe(100000n);
      expect(sf.candidates).toHaveLength(1);
      expect(sf.candidates[0]?.refId).toBe('verma-collection');
      expect(sf.candidates[0]?.coverPaise).toBe(4500000n);
      expect(sf.coveredPaise).toBe(100000n); // Covered full remaining deficit
      expect(sf.remainingGapPaise).toBe(0n);
    });
  });

  // -------------------------------------------------------------
  // What-If Scenarios & Delay Overrides (FR-D-07)
  // -------------------------------------------------------------
  describe('What-if delay overrides & scenario comparison', () => {
    it('shifts inflow date and computes comparison deltas', () => {
      const baselineInput: ForecastInput = {
        studioId: 'studio-1',
        plan: 'Starter',
        horizonDays: 30,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(5000000n), // ₹50,000
        },
        inflows: [
          {
            id: 'milestone-1',
            projectId: 'proj-1',
            expectedDate: '2026-03-05',
            amountPaise: paise(3000000n), // ₹30,000
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'bill-1',
            dueDate: '2026-03-10',
            amountPaise: paise(6000000n), // ₹60,000
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      // In baseline: balance on 2026-03-05 is 50,000 + 30,000 = 80,000.
      // On 2026-03-10: 80,000 - 60,000 = 20,000 (solvent).
      const baseline = computeRunway(baselineInput);
      expect(baseline.shortfalls).toHaveLength(0);
      expect(baseline.lowestBalancePaise).toBe(2000000n);

      // What-if: delay milestone-1 past the bill date to 2026-03-15
      const comparison = compareForecastScenarios(baselineInput, [
        {
          milestoneId: 'milestone-1',
          assumedCollectionDate: '2026-03-15',
        },
      ]);

      // In what-if: on 2026-03-10, balance drops to 50,000 - 60,000 = -10,000!
      expect(comparison.whatIf.shortfalls.length).toBeGreaterThan(0);
      expect(comparison.whatIf.lowestBalancePaise).toBe(-1000000n);
      expect(comparison.lowestBalanceDeltaPaise).toBe(-3000000n);
      expect(comparison.whatIf.runwayDaysCount).toBe(9); // First deficit on day 9 (2026-03-10)
    });
  });

  // -------------------------------------------------------------
  // FR-D-08 Consistency Rules
  // -------------------------------------------------------------
  describe('FR-D-08 consistency and boundary rules', () => {
    it('excludes items dated on or before asOfDate from forecast window', () => {
      const input: ForecastInput = {
        studioId: 'studio-1',
        plan: 'Starter',
        horizonDays: 7,
        openingBalance: {
          asOfDate: '2026-03-05',
          amountPaise: paise(1000000n),
        },
        inflows: [
          {
            id: 'past-inflow',
            projectId: 'proj-1',
            expectedDate: '2026-03-04', // past
            amountPaise: paise(500000n),
            confidence: 'OwnerConfirmed',
          },
          {
            id: 'same-day-inflow',
            projectId: 'proj-1',
            expectedDate: '2026-03-05', // asOfDate
            amountPaise: paise(500000n),
            confidence: 'OwnerConfirmed',
          },
          {
            id: 'future-inflow',
            projectId: 'proj-1',
            expectedDate: '2026-03-06', // in forecast
            amountPaise: paise(300000n),
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'past-outflow',
            dueDate: '2026-03-05', // asOfDate
            amountPaise: paise(200000n),
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);
      // Day 0 must have 0 inflows/outflows
      expect(result.days[0]?.inflowPaise).toBe(0n);
      expect(result.days[0]?.outflowPaise).toBe(0n);
      // Day 1 (2026-03-06) receives only future-inflow
      expect(result.days[1]?.inflowPaise).toBe(300000n);
      expect(result.days[1]?.balancePaise).toBe(1300000n);
    });

    it('ignores zero or negative amount line items', () => {
      const input: ForecastInput = {
        studioId: 'studio-1',
        plan: 'Starter',
        horizonDays: 5,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(100000n),
        },
        inflows: [
          {
            id: 'zero-inflow',
            projectId: 'proj-1',
            expectedDate: '2026-03-02',
            amountPaise: paise(0n),
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'zero-outflow',
            dueDate: '2026-03-03',
            amountPaise: paise(0n),
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);
      expect(result.days[1]?.inflowPaise).toBe(0n);
      expect(result.days[2]?.outflowPaise).toBe(0n);
      expect(result.lowestBalancePaise).toBe(100000n);
    });
  });

  // -------------------------------------------------------------
  // Rule 9 Collision Attribution & Flags
  // -------------------------------------------------------------
  describe('Collision candidate attribution & flags', () => {
    it('flags overdue milestones without date as AtRisk and milestones after shortfall as AfterVendorDue', () => {
      const input: ForecastInput = {
        studioId: 'studio-1',
        plan: 'Starter',
        horizonDays: 10,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(0n), // Start at 0
        },
        inflows: [
          {
            id: 'inflow-valid',
            projectId: 'p1',
            expectedDate: '2026-03-02',
            amountPaise: paise(100000n),
            confidence: 'OwnerConfirmed',
          },
          {
            id: 'inflow-no-date',
            projectId: 'p1',
            expectedDate: null,
            amountPaise: paise(200000n),
            confidence: 'SystemEstimated',
          },
          {
            id: 'inflow-after-due',
            projectId: 'p1',
            expectedDate: '2026-03-08',
            amountPaise: paise(300000n),
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'big-bill',
            dueDate: '2026-03-04',
            amountPaise: paise(500000n),
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      };

      const result = computeRunway(input);
      // On 2026-03-04 (day 3): balance is 100,000 - 500,000 = -400,000
      expect(result.shortfalls).toHaveLength(8); // from day 3 to 10 inclusive (8 days)
      const sf = result.shortfalls[0]!;
      expect(sf.shortfallDate).toBe('2026-03-04');
      expect(sf.shortfallPaise).toBe(400000n);

      // Verify candidates order by amount descending
      expect(sf.candidates).toHaveLength(3);
      expect(sf.candidates[0]?.coverPaise).toBeGreaterThanOrEqual(sf.candidates[1]?.coverPaise!);

      // Check flags
      const atRiskCandidate = sf.candidates.find((c) => c.refId === 'inflow-no-date');
      expect(atRiskCandidate?.flag).toBe('AtRisk');

      const afterDueCandidate = sf.candidates.find((c) => c.refId === 'inflow-after-due');
      expect(afterDueCandidate?.flag).toBe('AfterVendorDue');

      const validCandidate = sf.candidates.find((c) => c.refId === 'inflow-valid');
      expect(validCandidate?.flag).toBeUndefined();

      // Only validCandidate is counted in coveredPaise
      expect(sf.coveredPaise).toBe(100000n);
      expect(sf.remainingGapPaise).toBe(300000n);
    });
  });

  // -------------------------------------------------------------
  // Mandatory Adversarial & Negative Tests (2:1 Ratio Standard)
  // -------------------------------------------------------------
  describe('Adversarial & Negative Validation Tests', () => {
    const validBase: ForecastInput = {
      studioId: 'studio-test',
      plan: 'Free',
      horizonDays: 30,
      openingBalance: {
        asOfDate: '2026-03-01',
        amountPaise: paise(1000000n),
      },
      inflows: [],
      outflows: [],
    };

    // 1. Free plan limit enforcement (> 30 days)
    it('rejects horizon > 30 on Free plan with PLAN_LIMIT error', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          plan: 'Free',
          horizonDays: 31,
        }),
      ).toThrow(PlanLimitError);
    });

    it('rejects horizon 60 on Free plan with PLAN_LIMIT code', () => {
      try {
        computeRunway({
          ...validBase,
          plan: 'Free',
          horizonDays: 60,
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(PlanLimitError);
        expect((err as PlanLimitError).code).toBe('PLAN_LIMIT');
      }
    });

    // 2. Non-positive or fractional horizon days
    it('rejects non-positive horizon days (0)', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          horizonDays: 0,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects negative horizon days (-10)', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          horizonDays: -10,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects float horizon days (15.5)', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          horizonDays: 15.5,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects horizon exceeding maximum 90 days on Starter plan', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          plan: 'Starter',
          horizonDays: 91,
        }),
      ).toThrow(ValidationError);
    });

    // 3. Malformed or invalid dates
    it('rejects invalid opening balance asOfDate', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          openingBalance: {
            asOfDate: '2026-02-30', // Feb 30 does not exist
            amountPaise: paise(100000n),
          },
        }),
      ).toThrow(ValidationError);
    });

    it('rejects malformed string asOfDate', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          openingBalance: {
            asOfDate: 'not-a-date',
            amountPaise: paise(100000n),
          },
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid inflow expectedDate', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          inflows: [
            {
              id: 'bad-inflow',
              projectId: 'p1',
              expectedDate: '2026-13-45',
              amountPaise: paise(10000n),
              confidence: 'OwnerConfirmed',
            },
          ],
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid outflow dueDate', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          outflows: [
            {
              id: 'bad-outflow',
              dueDate: '2026-04-31', // April has 30 days
              amountPaise: paise(10000n),
              kind: 'VendorBill',
              confidence: 'OwnerConfirmed',
            },
          ],
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid assumedCollectionDate in delay overrides', () => {
      expect(() =>
        computeRunway({
          ...validBase,
          delayOverrides: [
            {
              milestoneId: 'm1',
              assumedCollectionDate: '2026-00-10',
            },
          ],
        }),
      ).toThrow(ValidationError);
    });

    // 4. Boundary cases: Negative initial balance
    it('handles negative initial balance (starting in deficit) correctly', () => {
      const result = computeRunway({
        ...validBase,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(-500000n), // -₹5,000
        },
      });

      expect(result.days[0]?.balancePaise).toBe(-500000n);
      expect(result.runwayDaysCount).toBe(1); // Day 1 is immediately in deficit
      expect(result.shortfalls).toHaveLength(30);
    });

    // 5. Boundary case: Outflow on Day 1 exceeds entire balance
    it('detects shortfall immediately on Day 1 when single outflow drains balance', () => {
      const result = computeRunway({
        ...validBase,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(100000n), // ₹1,000
        },
        outflows: [
          {
            id: 'rent',
            dueDate: '2026-03-02', // Day 1
            amountPaise: paise(500000n), // ₹5,000
            kind: 'RecurringExpense',
            confidence: 'OwnerConfirmed',
          },
        ],
      });

      expect(result.runwayDaysCount).toBe(1);
      expect(result.days[1]?.balancePaise).toBe(-400000n);
      expect(result.lowestBalancePaise).toBe(-400000n);
    });

    // 6. Configurable safety threshold
    it('triggers shortfalls when balance drops below non-zero safety threshold', () => {
      const result = computeRunway({
        ...validBase,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(500000n), // ₹5,000
        },
        safetyThresholdPaise: paise(1000000n), // ₹10,000 safety threshold
        outflows: [
          {
            id: 'misc',
            dueDate: '2026-03-05',
            amountPaise: paise(200000n), // drops to ₹3,000
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      });

      // Day 0 is already below threshold (5,000 < 10,000)
      // Day 5 drops to 3,000 (shortfall = 10,000 - 3,000 = 7,000)
      const sfDay5 = result.shortfalls.find((s) => s.shortfallDate === '2026-03-06');
      expect(sfDay5?.shortfallPaise).toBe(700000n);
    });

    // 7. Large integer paise precision (no float errors)
    it('handles multi-crore transactions without integer truncation or precision loss', () => {
      const largeOpening = 100_000_000_000n; // ₹100 Crores
      const largeInflow = 50_000_000_000n; // ₹50 Crores
      const largeOutflow = 20_000_000_000n; // ₹20 Crores

      const result = computeRunway({
        ...validBase,
        plan: 'Starter',
        horizonDays: 5,
        openingBalance: {
          asOfDate: '2026-03-01',
          amountPaise: paise(largeOpening),
        },
        inflows: [
          {
            id: 'large-inflow',
            projectId: 'p-large',
            expectedDate: '2026-03-02',
            amountPaise: paise(largeInflow),
            confidence: 'OwnerConfirmed',
          },
        ],
        outflows: [
          {
            id: 'large-outflow',
            dueDate: '2026-03-03',
            amountPaise: paise(largeOutflow),
            kind: 'VendorBill',
            confidence: 'OwnerConfirmed',
          },
        ],
      });

      // Final balance: 100 + 50 - 20 = 130 Crores (130,000,000,000 paise)
      expect(result.days[5]?.balancePaise).toBe(130_000_000_000n);
      expect(result.shortfalls).toHaveLength(0);
    });
  });
});
