import { describe, expect, it } from 'vitest';
import { paise } from '../../src/infrastructure/money.js';
import {
  buildAgingSummary,
  buildUpiDeepLink,
  calculateDaysOverdue,
  calculateMilestoneBalance,
  calculateProjectBalance,
  classifyAgingBucket,
  generateDefaultMilestoneSchedule,
  InvoicingService,
  InvoicingValidationError,
  MilestoneSumMismatchError,
  MissingTransactionReferenceError,
  OverpaymentError,
  validateMilestoneSchedule,
  VoidPaymentError,
  type Payment,
} from '../../src/modules/invoicing/index.js';

describe('Invoicing Module', () => {
  const service = new InvoicingService();

  // -------------------------------------------------------------
  // Default Schedule & Schedule Validation
  // -------------------------------------------------------------
  describe('Milestone schedules (FR-A-02, FR-A-08)', () => {
    it('creates exact 30/40/30 schedule with integer paise sum invariant', () => {
      // Contract value: ₹1,50,000 (15,000,000 paise)
      const contractPaise = paise(15000000n);
      const schedule = generateDefaultMilestoneSchedule(contractPaise, '2026-11-20', 'proj-1');

      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.percentage).toBe(30);
      expect(schedule[0]?.amountPaise).toBe(4500000n); // ₹45,000

      expect(schedule[1]?.percentage).toBe(40);
      expect(schedule[1]?.amountPaise).toBe(6000000n); // ₹60,000

      expect(schedule[2]?.percentage).toBe(30);
      expect(schedule[2]?.amountPaise).toBe(4500000n); // ₹45,000

      // Exact sum assertion
      const total = schedule.reduce((sum, m) => sum + m.amountPaise, 0n);
      expect(total).toBe(contractPaise);
    });

    it('ensures exact sum invariant even with odd paise amounts (no rounding drift)', () => {
      // Contract value: ₹1,00,000.01 (10,000,001 paise)
      const contractPaise = paise(10000001n);
      const schedule = generateDefaultMilestoneSchedule(contractPaise);

      const total = schedule.reduce((sum, m) => sum + m.amountPaise, 0n);
      expect(total).toBe(contractPaise);
    });

    it('sets correct due dates relative to event date', () => {
      const schedule = generateDefaultMilestoneSchedule(paise(10000000n), '2026-12-15');
      expect(schedule[0]?.dueDate).toBe('2026-11-15'); // Event date - 30 days
      expect(schedule[1]?.dueDate).toBe('2026-12-15'); // Event date
      expect(schedule[2]?.dueDate).toBe('2027-01-14'); // Event date + 30 days
    });

    it('validates custom milestone schedule successfully when sum matches', () => {
      const contractPaise = paise(10000000n);
      const custom = [
        { name: 'Token', percentage: 20, amountPaise: paise(2000000n), dueDate: '2026-05-01' },
        { name: 'Mid', percentage: 50, amountPaise: paise(5000000n), dueDate: '2026-06-01' },
        { name: 'End', percentage: 30, amountPaise: paise(3000000n), dueDate: '2026-07-01' },
      ];
      expect(() => validateMilestoneSchedule(custom, contractPaise)).not.toThrow();
    });
  });

  // -------------------------------------------------------------
  // Milestone & Project Balance Math (Rule 1 & 2)
  // -------------------------------------------------------------
  describe('Balance Tracking (Rules 1 & 2)', () => {
    it('reduces balance on verified owner-confirmed payments', () => {
      const milestoneAmount = paise(5000000n); // ₹50,000
      const payments: Array<{ amountPaise: bigint; voided: boolean; verificationStatus: 'OwnerConfirmed' | 'Unverified' }> = [
        { amountPaise: paise(2000000n), voided: false, verificationStatus: 'OwnerConfirmed' },
      ];

      const res = calculateMilestoneBalance(milestoneAmount, payments);
      expect(res.balancePaise).toBe(3000000n); // ₹30,000 remaining
      expect(res.verifiedCollectedPaise).toBe(2000000n);
      expect(res.unverifiedPendingPaise).toBe(0n);
    });

    it('does NOT reduce balance on unverified client portal payments', () => {
      const milestoneAmount = paise(5000000n);
      const payments: Array<{ amountPaise: bigint; voided: boolean; verificationStatus: 'OwnerConfirmed' | 'Unverified' }> = [
        { amountPaise: paise(2000000n), voided: false, verificationStatus: 'Unverified' },
      ];

      const res = calculateMilestoneBalance(milestoneAmount, payments);
      expect(res.balancePaise).toBe(5000000n); // Unaltered
      expect(res.verifiedCollectedPaise).toBe(0n);
      expect(res.unverifiedPendingPaise).toBe(2000000n);
    });

    it('ignores voided payments completely when calculating balances', () => {
      const milestoneAmount = paise(5000000n);
      const payments: Array<{ amountPaise: bigint; voided: boolean; verificationStatus: 'OwnerConfirmed' | 'Unverified' }> = [
        { amountPaise: paise(2000000n), voided: true, verificationStatus: 'OwnerConfirmed' },
      ];

      const res = calculateMilestoneBalance(milestoneAmount, payments);
      expect(res.balancePaise).toBe(5000000n);
      expect(res.verifiedCollectedPaise).toBe(0n);
    });

    it('calculates project balance across all milestone balances', () => {
      const projectBalance = calculateProjectBalance([paise(2000000n), paise(4000000n), paise(1000000n)]);
      expect(projectBalance).toBe(7000000n);
    });
  });

  // -------------------------------------------------------------
  // Overdue & Aging Buckets (Rules 3 & 4)
  // -------------------------------------------------------------
  describe('Days Overdue and Aging Buckets (Rules 3 & 4)', () => {
    it('returns 0 days overdue if milestone balance is zero or dueDate is null', () => {
      expect(calculateDaysOverdue(null, paise(5000000n), '2026-06-01')).toBe(0);
      expect(calculateDaysOverdue('2026-05-01', paise(0n), '2026-06-01')).toBe(0);
    });

    it('returns 0 days overdue for future due dates', () => {
      expect(calculateDaysOverdue('2026-06-10', paise(5000000n), '2026-06-01')).toBe(0);
    });

    it('calculates exact overdue days past due date', () => {
      expect(calculateDaysOverdue('2026-05-20', paise(5000000n), '2026-06-01')).toBe(12);
    });

    it('classifies aging into exact PRD buckets: 0, 1–15, 16–30, 31–60, 61+', () => {
      expect(classifyAgingBucket(0)).toBe('0');
      expect(classifyAgingBucket(1)).toBe('1–15');
      expect(classifyAgingBucket(15)).toBe('1–15');
      expect(classifyAgingBucket(16)).toBe('16–30');
      expect(classifyAgingBucket(30)).toBe('16–30');
      expect(classifyAgingBucket(31)).toBe('31–60');
      expect(classifyAgingBucket(60)).toBe('31–60');
      expect(classifyAgingBucket(61)).toBe('61+');
      expect(classifyAgingBucket(120)).toBe('61+');
    });

    it('builds aggregated receivables aging summary', () => {
      const asOf = '2026-06-01';
      const summary = buildAgingSummary(
        [
          { id: 'm1', projectId: 'p1', name: 'Advance', dueDate: '2026-06-15', balancePaise: paise(1000000n) }, // 0
          { id: 'm2', projectId: 'p1', name: 'Shoot', dueDate: '2026-05-25', balancePaise: paise(2000000n) }, // 7 days (1–15)
          { id: 'm3', projectId: 'p2', name: 'Shoot', dueDate: '2026-05-10', balancePaise: paise(3000000n) }, // 22 days (16–30)
          { id: 'm4', projectId: 'p2', name: 'Balance', dueDate: '2026-04-15', balancePaise: paise(4000000n) }, // 47 days (31–60)
          { id: 'm5', projectId: 'p3', name: 'Old', dueDate: '2026-02-01', balancePaise: paise(5000000n) }, // 120 days (61+)
        ],
        asOf,
      );

      expect(summary.buckets['0']).toBe(1000000n);
      expect(summary.buckets['1–15']).toBe(2000000n);
      expect(summary.buckets['16–30']).toBe(3000000n);
      expect(summary.buckets['31–60']).toBe(4000000n);
      expect(summary.buckets['61+']).toBe(5000000n);

      expect(summary.totalOutstandingPaise).toBe(15000000n);
      expect(summary.totalOverduePaise).toBe(14000000n); // Excludes not-yet-due
    });
  });

  // -------------------------------------------------------------
  // Payment Recording, Splits, and Voiding
  // -------------------------------------------------------------
  describe('Invoicing Service Operations', () => {
    it('records a verified payment with UTR and updates balances', () => {
      const res = service.recordPayment(
        {
          studioId: 'studio-1',
          milestoneId: 'ms-1',
          amountPaise: paise(3000000n),
          payerName: 'Rohan Sharma',
          paymentMode: 'UPI',
          transactionUtrRef: 'UTR123456789',
          receivedOn: '2026-05-15',
        },
        paise(5000000n),
        [],
        [paise(5000000n)],
      );

      expect(res.payment.id).toMatch(/^pay-/);
      expect(res.payment.verificationStatus).toBe('OwnerConfirmed');
      expect(res.milestoneBalancePaise).toBe(2000000n);
    });

    it('records a split payment across multiple milestones (FR-A-08)', () => {
      const msData = new Map<string, { amountPaise: bigint; existingPayments: Payment[] }>([
        ['ms-1', { amountPaise: paise(3000000n), existingPayments: [] }],
        ['ms-2', { amountPaise: paise(4000000n), existingPayments: [] }],
      ]);

      const payments = service.recordSplitPayment(
        {
          studioId: 'studio-1',
          payerName: 'Rohan Sharma',
          paymentMode: 'BankTransfer',
          transactionUtrRef: 'NEFT998877',
          receivedOn: '2026-05-15',
          shares: [
            { milestoneId: 'ms-1', amountPaise: paise(3000000n) },
            { milestoneId: 'ms-2', amountPaise: paise(1000000n) },
          ],
        },
        msData,
      );

      expect(payments).toHaveLength(2);
      expect(payments[0]?.milestoneId).toBe('ms-1');
      expect(payments[0]?.amountPaise).toBe(3000000n);
      expect(payments[1]?.milestoneId).toBe('ms-2');
      expect(payments[1]?.amountPaise).toBe(1000000n);
    });

    it('voids a payment and records reason and timestamp (FR-A-07)', () => {
      const payment: Payment = {
        id: 'pay-test',
        studioId: 'studio-1',
        milestoneId: 'ms-1',
        amountPaise: paise(2000000n),
        payerName: 'Rohan',
        paymentMode: 'Cash',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-05-15',
        voided: false,
      };

      const voided = service.voidPayment(payment, 'Wrong amount entered by clerk', '2026-05-16');
      expect(voided.voided).toBe(true);
      expect(voided.voidReason).toBe('Wrong amount entered by clerk');
      expect(voided.voidedAt).toBe('2026-05-16');
    });
  });

  // -------------------------------------------------------------
  // NPCI UPI Deep Link Generation (FR-G-03)
  // -------------------------------------------------------------
  describe('UPI Deep Link (FR-G-03)', () => {
    it('generates standard NPCI URL-encoded deep link', () => {
      const url = buildUpiDeepLink({
        payeeUpiId: 'studio@icici',
        payeeName: 'Aarav Photography',
        amountPaise: paise(4500000n), // ₹45,000.00
        transactionNote: 'Invoice 101 – Sharma Wedding',
      });

      expect(url).toMatch(/^upi:\/\/pay\?/);
      expect(url).toContain('pa=studio%40icici');
      expect(url).toContain('pn=Aarav+Photography');
      expect(url).toContain('am=45000.00');
      expect(url).toContain('cu=INR');
    });
  });

  // -------------------------------------------------------------
  // Mandatory Adversarial & Negative Tests (2:1 Ratio Standard)
  // -------------------------------------------------------------
  describe('Adversarial & Negative Validation Tests', () => {
    // 1. Milestone schedule mismatch
    it('rejects schedule where amounts sum to more than contract value', () => {
      const contractPaise = paise(10000000n); // ₹1,00,000
      const invalid = [
        { name: 'M1', percentage: 50, amountPaise: paise(5000000n) },
        { name: 'M2', percentage: 60, amountPaise: paise(6000000n) }, // 50 + 60 = 110,000
      ];
      expect(() => validateMilestoneSchedule(invalid, contractPaise)).toThrow(MilestoneSumMismatchError);
    });

    it('rejects schedule where amounts sum to less than contract value', () => {
      const contractPaise = paise(10000000n);
      const invalid = [
        { name: 'M1', percentage: 50, amountPaise: paise(5000000n) },
        { name: 'M2', percentage: 40, amountPaise: paise(4000000n) }, // 90,000
      ];
      expect(() => validateMilestoneSchedule(invalid, contractPaise)).toThrow(MilestoneSumMismatchError);
    });

    it('rejects schedule with non-positive milestone amount', () => {
      expect(() =>
        validateMilestoneSchedule(
          [{ name: 'Zero', percentage: 100, amountPaise: paise(0n) }],
          paise(100000n),
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects empty milestone list', () => {
      expect(() => validateMilestoneSchedule([], paise(100000n))).toThrow(InvoicingValidationError);
    });

    it('rejects invalid milestone due date format', () => {
      expect(() =>
        validateMilestoneSchedule(
          [{ name: 'Bad Date', percentage: 100, amountPaise: paise(100000n), dueDate: 'invalid-date' }],
          paise(100000n),
        ),
      ).toThrow(InvoicingValidationError);
    });

    // 2. Overpayment rejection
    it('strictly rejects overpayment when amount exceeds remaining milestone balance', () => {
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(6000000n), // Trying to pay ₹60,000
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-05-15',
          },
          paise(5000000n), // Total milestone is only ₹50,000
          [],
          [paise(5000000n)],
        ),
      ).toThrow(OverpaymentError);
    });

    it('rejects overpayment on remaining balance when milestone has partial payment', () => {
      const existingPayments: Payment[] = [
        {
          id: 'pay-1',
          studioId: 'studio-1',
          milestoneId: 'ms-1',
          amountPaise: paise(4000000n), // Already paid 40,000
          payerName: 'Rohan',
          paymentMode: 'Cash',
          verificationStatus: 'OwnerConfirmed',
          receivedOn: '2026-05-10',
          voided: false,
        },
      ];

      // Remaining is 10,000 paise; trying to pay 10,001 paise
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(1000100n),
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-05-15',
          },
          paise(5000000n),
          existingPayments,
          [paise(1000000n)],
        ),
      ).toThrow(OverpaymentError);
    });

    // 3. Mandatory UTR for UPI / Bank Transfer
    it('rejects UPI payment without transaction reference (UTR)', () => {
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(1000000n),
            payerName: 'Rohan',
            paymentMode: 'UPI',
            transactionUtrRef: '', // Missing
            receivedOn: '2026-05-15',
          },
          paise(5000000n),
          [],
          [paise(5000000n)],
        ),
      ).toThrow(MissingTransactionReferenceError);
    });

    it('rejects BankTransfer payment with whitespace-only UTR', () => {
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(1000000n),
            payerName: 'Rohan',
            paymentMode: 'BankTransfer',
            transactionUtrRef: '   ',
            receivedOn: '2026-05-15',
          },
          paise(5000000n),
          [],
          [paise(5000000n)],
        ),
      ).toThrow(MissingTransactionReferenceError);
    });

    // 4. Invalid payment parameters
    it('rejects non-positive payment amount (0)', () => {
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(0n),
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-05-15',
          },
          paise(5000000n),
          [],
          [paise(5000000n)],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects invalid receivedOn calendar date', () => {
      expect(() =>
        service.recordPayment(
          {
            studioId: 'studio-1',
            milestoneId: 'ms-1',
            amountPaise: paise(100000n),
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-02-31', // Invalid
          },
          paise(5000000n),
          [],
          [paise(5000000n)],
        ),
      ).toThrow(InvoicingValidationError);
    });

    // 5. Voiding errors
    it('rejects voiding an already-voided payment', () => {
      const voidedPayment: Payment = {
        id: 'pay-voided',
        studioId: 'studio-1',
        milestoneId: 'ms-1',
        amountPaise: paise(100000n),
        payerName: 'Rohan',
        paymentMode: 'Cash',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-05-15',
        voided: true,
      };

      expect(() => service.voidPayment(voidedPayment, 'Second attempt')).toThrow(VoidPaymentError);
    });

    it('rejects voiding a payment without specifying a reason', () => {
      const activePayment: Payment = {
        id: 'pay-active',
        studioId: 'studio-1',
        milestoneId: 'ms-1',
        amountPaise: paise(100000n),
        payerName: 'Rohan',
        paymentMode: 'Cash',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-05-15',
        voided: false,
      };

      expect(() => service.voidPayment(activePayment, '')).toThrow(VoidPaymentError);
      expect(() => service.voidPayment(activePayment, '   ')).toThrow(VoidPaymentError);
    });

    // 6. Split payment adversarial checks
    it('rejects split payment with empty shares', () => {
      expect(() =>
        service.recordSplitPayment(
          {
            studioId: 'studio-1',
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-05-15',
            shares: [],
          },
          new Map(),
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects split payment referencing non-existent milestone', () => {
      expect(() =>
        service.recordSplitPayment(
          {
            studioId: 'studio-1',
            payerName: 'Rohan',
            paymentMode: 'Cash',
            receivedOn: '2026-05-15',
            shares: [{ milestoneId: 'ms-missing', amountPaise: paise(100000n) }],
          },
          new Map(),
        ),
      ).toThrow(InvoicingValidationError);
    });

    // 7. UPI validation checks
    it('rejects UPI link generation with malformed UPI ID (no @)', () => {
      expect(() =>
        buildUpiDeepLink({
          payeeUpiId: 'invalid-upi-handle',
          payeeName: 'Studio',
          amountPaise: paise(100000n),
          transactionNote: 'Test',
        }),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects UPI link generation with zero amount', () => {
      expect(() =>
        buildUpiDeepLink({
          payeeUpiId: 'studio@okaxis',
          payeeName: 'Studio',
          amountPaise: paise(0n),
          transactionNote: 'Test',
        }),
      ).toThrow(InvoicingValidationError);
    });
  });
});
