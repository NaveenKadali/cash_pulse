import { beforeEach, describe, expect, it } from 'vitest';
import {
  BillNotFoundError,
  BillOverpaymentError,
  BillValidationError,
  VendorNotFoundError,
  VendorDirectory,
  InMemoryVendorRepository,
  InMemoryVendorBillRepository,
  InMemoryVendorPaymentRepository,
  VendorBillService,
  calculateAgingBucket,
  calculateBillStatus,
  calculateRemainingPayable,
  generatePayablesAgingReport,
} from '../../src/modules/vendors/index.js';

describe('Vendor Bills, Payments & Payables Aging (PRD FR-B-02, FR-B-05, FR-B-07)', () => {
  const STUDIO_ID = '00000000-0000-0000-0000-000000000001';
  const OTHER_STUDIO_ID = '00000000-0000-0000-0000-000000000002';

  let vendorRepo: InMemoryVendorRepository;
  let billRepo: InMemoryVendorBillRepository;
  let paymentRepo: InMemoryVendorPaymentRepository;
  let service: VendorBillService;
  let testVendorId: string;

  beforeEach(async () => {
    vendorRepo = new InMemoryVendorRepository();
    billRepo = new InMemoryVendorBillRepository();
    paymentRepo = new InMemoryVendorPaymentRepository();
    service = new VendorBillService(billRepo, paymentRepo, vendorRepo);

    const vendorDir = new VendorDirectory(vendorRepo);
    const vendor = await vendorDir.createVendor({
      studioId: STUDIO_ID,
      name: 'Vikas Album Prints',
      phone: '+919876543210',
      category: 'print_lab',
      defaultRatePaise: 5000000n, // ₹50,000
    });
    testVendorId = vendor.id;
  });

  // -----------------------------------------------------------
  // Pure Math & Calculations
  // -----------------------------------------------------------
  describe('calculateRemainingPayable & calculateBillStatus', () => {
    it('accurately calculates remaining payable and status across payment lifecycle', () => {
      const billAmount = 10000000n; // ₹1,00,000

      // 0 paid
      expect(calculateRemainingPayable(billAmount, [])).toBe(10000000n);
      expect(calculateBillStatus(billAmount, [])).toBe('UNPAID');

      // partial paid (₹40,000)
      const p1 = [{ amountPaise: 4000000n }];
      expect(calculateRemainingPayable(billAmount, p1)).toBe(6000000n);
      expect(calculateBillStatus(billAmount, p1)).toBe('PARTIALLY_PAID');

      // fully paid (₹40,000 + ₹60,000)
      const p2 = [{ amountPaise: 4000000n }, { amountPaise: 6000000n }];
      expect(calculateRemainingPayable(billAmount, p2)).toBe(0n);
      expect(calculateBillStatus(billAmount, p2)).toBe('PAID');
    });

    it('clamps remaining payable to 0n if payments sum exceeds amount', () => {
      expect(calculateRemainingPayable(5000n, [{ amountPaise: 6000n }])).toBe(0n);
    });

    it('returns PAID if payments exceed bill amount in calculation', () => {
      expect(calculateBillStatus(5000n, [{ amountPaise: 6000n }])).toBe('PAID');
    });
  });

  describe('calculateAgingBucket', () => {
    it('returns 0 bucket when not yet due or due today', () => {
      expect(calculateAgingBucket('2026-11-20', '2026-11-25')).toBe('0');
      expect(calculateAgingBucket('2026-11-25', '2026-11-25')).toBe('0');
    });

    it('correctly maps overdue days into canonical PRD buckets', () => {
      // 1-15 days overdue
      expect(calculateAgingBucket('2026-11-26', '2026-11-25')).toBe('1–15'); // 1 day
      expect(calculateAgingBucket('2026-12-10', '2026-11-25')).toBe('1–15'); // 15 days

      // 16-30 days overdue
      expect(calculateAgingBucket('2026-12-11', '2026-11-25')).toBe('16–30'); // 16 days
      expect(calculateAgingBucket('2026-12-25', '2026-11-25')).toBe('16–30'); // 30 days

      // 31-60 days overdue
      expect(calculateAgingBucket('2026-12-26', '2026-11-25')).toBe('31–60'); // 31 days
      expect(calculateAgingBucket('2027-01-24', '2026-11-25')).toBe('31–60'); // 60 days

      // 61+ days overdue
      expect(calculateAgingBucket('2027-01-25', '2026-11-25')).toBe('61+'); // 61 days
      expect(calculateAgingBucket('2027-05-01', '2026-11-25')).toBe('61+');
    });
  });

  // -----------------------------------------------------------
  // Bill Creation & Validation (Positive & Adversarial)
  // -----------------------------------------------------------
  describe('createBill', () => {
    it('creates a bill successfully with valid input', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 7000000n, // ₹70,000 (Aarav Pixels print lab bill)
        dueDate: '2026-12-05',
        notes: 'Wedding album printing and bind',
      });

      expect(bill.id).toBeDefined();
      expect(bill.studioId).toBe(STUDIO_ID);
      expect(bill.vendorId).toBe(testVendorId);
      expect(bill.amountPaise).toBe(7000000n);
      expect(bill.dueDate).toBe('2026-12-05');
      expect(bill.notes).toBe('Wedding album printing and bind');
    });

    // Adversarial Negative Tests
    it('rejects bill creation when studioId is missing', async () => {
      await expect(
        service.createBill({
          studioId: '',
          vendorId: testVendorId,
          amountPaise: 1000n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects bill creation when vendorId is missing', async () => {
      await expect(
        service.createBill({
          studioId: STUDIO_ID,
          vendorId: '',
          amountPaise: 1000n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects bill creation when vendor does not exist', async () => {
      await expect(
        service.createBill({
          studioId: STUDIO_ID,
          vendorId: '11111111-1111-1111-1111-111111111111',
          amountPaise: 1000n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(VendorNotFoundError);
    });

    it('rejects bill creation when vendor belongs to a different studio', async () => {
      await expect(
        service.createBill({
          studioId: OTHER_STUDIO_ID,
          vendorId: testVendorId,
          amountPaise: 1000n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(VendorNotFoundError);
    });

    it('rejects bill creation when amount is zero', async () => {
      await expect(
        service.createBill({
          studioId: STUDIO_ID,
          vendorId: testVendorId,
          amountPaise: 0n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects bill creation when amount is negative', async () => {
      await expect(
        service.createBill({
          studioId: STUDIO_ID,
          vendorId: testVendorId,
          amountPaise: -50000n,
          dueDate: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects bill creation when dueDate has invalid calendar format', async () => {
      await expect(
        service.createBill({
          studioId: STUDIO_ID,
          vendorId: testVendorId,
          amountPaise: 50000n,
          dueDate: '2026-02-30', // Feb 30 does not exist
        }),
      ).rejects.toThrow(BillValidationError);
    });
  });

  // -----------------------------------------------------------
  // Vendor Payments (Positive & Adversarial)
  // -----------------------------------------------------------
  describe('recordPayment', () => {
    it('records partial payments and tracks remaining payable down to zero', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 5000000n, // ₹50,000
        dueDate: '2026-12-10',
      });

      // Part 1: ₹20,000 advance payment
      const p1 = await service.recordPayment({
        studioId: STUDIO_ID,
        billId: bill.id,
        amountPaise: 2000000n,
        paidOn: '2026-12-01',
        paymentMode: 'UPI',
        transactionUtrRef: 'UPI123456789012',
      });

      expect(p1.remainingPayablePaise).toBe(3000000n);
      expect(p1.status).toBe('PARTIALLY_PAID');
      expect(p1.payment.amountPaise).toBe(2000000n);

      // Part 2: ₹30,000 final settlement
      const p2 = await service.recordPayment({
        studioId: STUDIO_ID,
        billId: bill.id,
        amountPaise: 3000000n,
        paidOn: '2026-12-09',
        paymentMode: 'Bank transfer',
        transactionUtrRef: 'AXIS987654321',
      });

      expect(p2.remainingPayablePaise).toBe(0n);
      expect(p2.status).toBe('PAID');

      const details = await service.getBillDetails(STUDIO_ID, bill.id);
      expect(details.status).toBe('PAID');
      expect(details.totalPaidPaise).toBe(5000000n);
      expect(details.remainingPayablePaise).toBe(0n);
      expect(details.payments).toHaveLength(2);
    });

    // Adversarial Negative Tests
    it('rejects payment exceeding remaining payable (overpayment protection)', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 5000000n, // ₹50,000
        dueDate: '2026-12-10',
      });

      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: bill.id,
          amountPaise: 5000001n, // 1 paise over
          paidOn: '2026-12-01',
        }),
      ).rejects.toThrow(BillOverpaymentError);
    });

    it('rejects additional payment when bill is already fully settled', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 2000000n,
        dueDate: '2026-12-10',
      });

      // Settle in full
      await service.recordPayment({
        studioId: STUDIO_ID,
        billId: bill.id,
        amountPaise: 2000000n,
        paidOn: '2026-12-01',
      });

      // Try paying again
      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: bill.id,
          amountPaise: 100n,
          paidOn: '2026-12-02',
        }),
      ).rejects.toThrow(BillOverpaymentError);
    });

    it('rejects payment for a non-existent bill', async () => {
      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: '99999999-9999-9999-9999-999999999999',
          amountPaise: 1000n,
          paidOn: '2026-12-01',
        }),
      ).rejects.toThrow(BillNotFoundError);
    });

    it('rejects payment for a bill belonging to another studio (tenancy violation)', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 1000000n,
        dueDate: '2026-12-10',
      });

      await expect(
        service.recordPayment({
          studioId: OTHER_STUDIO_ID,
          billId: bill.id,
          amountPaise: 500000n,
          paidOn: '2026-12-01',
        }),
      ).rejects.toThrow(BillNotFoundError);
    });

    it('rejects payment with zero amount', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 1000000n,
        dueDate: '2026-12-10',
      });

      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: bill.id,
          amountPaise: 0n,
          paidOn: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects payment with negative amount', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 1000000n,
        dueDate: '2026-12-10',
      });

      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: bill.id,
          amountPaise: -500n,
          paidOn: '2026-12-01',
        }),
      ).rejects.toThrow(BillValidationError);
    });

    it('rejects payment with invalid paidOn calendar date', async () => {
      const bill = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 1000000n,
        dueDate: '2026-12-10',
      });

      await expect(
        service.recordPayment({
          studioId: STUDIO_ID,
          billId: bill.id,
          amountPaise: 500000n,
          paidOn: 'invalid-date',
        }),
      ).rejects.toThrow(BillValidationError);
    });
  });

  // -----------------------------------------------------------
  // Payables Aging Report (PRD FR-B-05)
  // -----------------------------------------------------------
  describe('getPayablesAging', () => {
    it('produces an accurate payables aging report sorted by due date', async () => {
      // Bill 1: Due in 5 days (not overdue) - ₹30,000
      const b1 = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 3000000n,
        dueDate: '2026-11-27',
      });

      // Bill 2: Overdue by 10 days - ₹50,000 with ₹20,000 partial payment -> ₹30,000 remaining
      const b2 = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 5000000n,
        dueDate: '2026-11-12',
      });
      await service.recordPayment({
        studioId: STUDIO_ID,
        billId: b2.id,
        amountPaise: 2000000n,
        paidOn: '2026-11-10',
      });

      // Bill 3: Fully settled bill - ₹10,000 (should be excluded from aging)
      const b3 = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        amountPaise: 1000000n,
        dueDate: '2026-11-01',
      });
      await service.recordPayment({
        studioId: STUDIO_ID,
        billId: b3.id,
        amountPaise: 1000000n,
        paidOn: '2026-11-02',
      });

      const report = await service.getPayablesAging(STUDIO_ID, '2026-11-22');

      expect(report.asOfDate).toBe('2026-11-22');
      expect(report.totalPayablePaise).toBe(6000000n); // 30k + 30k
      expect(report.totalOverduePaise).toBe(3000000n); // only b2 is overdue
      expect(report.items).toHaveLength(2); // b3 excluded

      // Sorted by due date: b2 (Nov 12) before b1 (Nov 27)
      expect(report.items[0]?.billId).toBe(b2.id);
      expect(report.items[0]?.isOverdue).toBe(true);
      expect(report.items[0]?.daysOverdue).toBe(10);
      expect(report.items[0]?.bucket).toBe('1–15');
      expect(report.items[0]?.remainingPayablePaise).toBe(3000000n);
      expect(report.items[0]?.status).toBe('PARTIALLY_PAID');

      expect(report.items[1]?.billId).toBe(b1.id);
      expect(report.items[1]?.isOverdue).toBe(false);
      expect(report.items[1]?.daysOverdue).toBe(0);
      expect(report.items[1]?.bucket).toBe('0');
      expect(report.items[1]?.remainingPayablePaise).toBe(3000000n);
      expect(report.items[1]?.status).toBe('UNPAID');
    });

    it('rejects generatePayablesAgingReport with invalid asOfDate', () => {
      expect(() => generatePayablesAgingReport('invalid-date', [])).toThrow(BillValidationError);
    });
  });

  // -----------------------------------------------------------
  // Project Actual Costs Aggregation (PRD FR-B-03)
  // -----------------------------------------------------------
  describe('getProjectActualCosts', () => {
    it('aggregates actual vendor costs linked to a specific project', async () => {
      const PROJ_A = '10000000-0000-0000-0000-000000000001';
      const PROJ_B = '20000000-0000-0000-0000-000000000002';

      await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        linkedProjectId: PROJ_A,
        amountPaise: 4000000n, // ₹40,000
        dueDate: '2026-12-01',
      });

      const billA2 = await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        linkedProjectId: PROJ_A,
        amountPaise: 2500000n, // ₹25,000
        dueDate: '2026-12-05',
      });
      await service.recordPayment({
        studioId: STUDIO_ID,
        billId: billA2.id,
        amountPaise: 1000000n, // ₹10,000 paid
        paidOn: '2026-12-02',
      });

      // Bill for Project B (should not leak into Project A)
      await service.createBill({
        studioId: STUDIO_ID,
        vendorId: testVendorId,
        linkedProjectId: PROJ_B,
        amountPaise: 8000000n,
        dueDate: '2026-12-15',
      });

      const costsA = await service.getProjectActualCosts(STUDIO_ID, PROJ_A);
      expect(costsA.bills).toHaveLength(2);
      expect(costsA.totalActualCostPaise).toBe(6500000n); // 40k + 25k
      expect(costsA.remainingPayablePaise).toBe(5500000n); // 65k - 10k
    });
  });
});
