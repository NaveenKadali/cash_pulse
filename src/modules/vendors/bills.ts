import { randomUUID } from 'node:crypto';
import { daysBetween, isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import {
  BillNotFoundError,
  BillOverpaymentError,
  BillValidationError,
  VendorNotFoundError,
} from './errors';
import type {
  AgingBucket,
  BillAgingItem,
  BillStatus,
  CreateBillInput,
  PayablesAgingReport,
  RecordVendorPaymentInput,
  VendorBill,
  VendorBillRepository,
  VendorPayment,
  VendorPaymentRepository,
  VendorRepository,
} from './types';

/**
 * Calculates remaining payable for a bill in paise.
 * remaining = bill.amountPaise - sum(payments.amountPaise).
 */
export function calculateRemainingPayable(
  billAmountPaise: bigint,
  payments: readonly { amountPaise: bigint }[],
): bigint {
  const totalPaid = payments.reduce((acc, p) => acc + p.amountPaise, 0n);
  const remaining = billAmountPaise - totalPaid;
  return remaining < 0n ? 0n : remaining;
}

/**
 * Derives bill status based on payments:
 * - 'UNPAID': 0 paid
 * - 'PARTIALLY_PAID': 0 < totalPaid < billAmount
 * - 'PAID': totalPaid >= billAmount
 */
export function calculateBillStatus(
  billAmountPaise: bigint,
  payments: readonly { amountPaise: bigint }[],
): BillStatus {
  const totalPaid = payments.reduce((acc, p) => acc + p.amountPaise, 0n);
  if (totalPaid <= 0n) return 'UNPAID';
  if (totalPaid >= billAmountPaise) return 'PAID';
  return 'PARTIALLY_PAID';
}

/**
 * Determines aging bucket from days overdue (PRD §7 rule 4):
 * - 0: not yet due (asOfDate <= dueDate)
 * - 1–15
 * - 16–30
 * - 31–60
 * - 61+
 */
export function calculateAgingBucket(asOfDate: string, dueDate: string): AgingBucket {
  if (asOfDate <= dueDate) {
    return '0';
  }
  const overdueDays = daysBetween(dueDate, asOfDate);
  if (overdueDays <= 0) return '0';
  if (overdueDays <= 15) return '1–15';
  if (overdueDays <= 30) return '16–30';
  if (overdueDays <= 60) return '31–60';
  return '61+';
}

export interface BillWithPayments {
  bill: VendorBill;
  vendorName: string;
  payments: VendorPayment[];
}

/**
 * Compiles a payables aging report for all unpaid and partially paid bills (PRD FR-B-05).
 * Sorted by dueDate ascending. Overdue items flagged when asOfDate > dueDate.
 */
export function generatePayablesAgingReport(
  asOfDate: string,
  records: BillWithPayments[],
): PayablesAgingReport {
  if (!isValidCalendarDate(asOfDate)) {
    throw new BillValidationError(`Invalid asOfDate calendar format: "${asOfDate}"`);
  }

  const items: BillAgingItem[] = [];
  let totalPayablePaise = 0n;
  let totalOverduePaise = 0n;

  for (const { bill, vendorName, payments } of records) {
    const totalPaid = payments.reduce((acc, p) => acc + p.amountPaise, 0n);
    const remaining = bill.amountPaise - totalPaid;

    if (remaining <= 0n) {
      continue; // exclude fully paid bills from payables aging report
    }

    const isOverdue = asOfDate > bill.dueDate;
    const overdueDays = isOverdue ? daysBetween(bill.dueDate, asOfDate) : 0;
    const bucket = calculateAgingBucket(asOfDate, bill.dueDate);
    const status = calculateBillStatus(bill.amountPaise, payments);

    totalPayablePaise += remaining;
    if (isOverdue) {
      totalOverduePaise += remaining;
    }

    items.push({
      billId: bill.id,
      vendorId: bill.vendorId,
      vendorName,
      linkedProjectId: bill.linkedProjectId,
      totalAmountPaise: bill.amountPaise,
      paidAmountPaise: totalPaid,
      remainingPayablePaise: remaining,
      dueDate: bill.dueDate,
      daysOverdue: overdueDays,
      isOverdue,
      status,
      bucket,
    });
  }

  // Sort by due date ascending
  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    asOfDate,
    totalPayablePaise,
    totalOverduePaise,
    items,
  };
}

/**
 * In-memory repository for VendorBill.
 */
export class InMemoryVendorBillRepository implements VendorBillRepository {
  private readonly store = new Map<string, VendorBill>();

  async findById(studioId: string, id: string): Promise<VendorBill | null> {
    const item = this.store.get(id);
    if (!item || item.studioId !== studioId) return null;
    return { ...item };
  }

  async listByStudio(studioId: string): Promise<VendorBill[]> {
    return Array.from(this.store.values())
      .filter((b) => b.studioId === studioId)
      .map((b) => ({ ...b }));
  }

  async listByProject(studioId: string, projectId: string): Promise<VendorBill[]> {
    return Array.from(this.store.values())
      .filter((b) => b.studioId === studioId && b.linkedProjectId === projectId)
      .map((b) => ({ ...b }));
  }

  async insert(bill: VendorBill): Promise<void> {
    this.store.set(bill.id, { ...bill });
  }

  async update(bill: VendorBill): Promise<void> {
    this.store.set(bill.id, { ...bill });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * In-memory repository for VendorPayment.
 */
export class InMemoryVendorPaymentRepository implements VendorPaymentRepository {
  private readonly store = new Map<string, VendorPayment>();

  async findById(studioId: string, id: string): Promise<VendorPayment | null> {
    const item = this.store.get(id);
    if (!item || item.studioId !== studioId) return null;
    return { ...item };
  }

  async listByBill(studioId: string, billId: string): Promise<VendorPayment[]> {
    return Array.from(this.store.values())
      .filter((p) => p.studioId === studioId && p.billId === billId)
      .map((p) => ({ ...p }));
  }

  async listByStudio(studioId: string): Promise<VendorPayment[]> {
    return Array.from(this.store.values())
      .filter((p) => p.studioId === studioId)
      .map((p) => ({ ...p }));
  }

  async insert(payment: VendorPayment): Promise<void> {
    this.store.set(payment.id, { ...payment });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Service orchestrating Vendor Bills and Vendor Payments (PRD FR-B-02, FR-B-05, FR-B-07).
 */
export class VendorBillService {
  constructor(
    private readonly billRepo: VendorBillRepository,
    private readonly paymentRepo: VendorPaymentRepository,
    private readonly vendorRepo: VendorRepository,
  ) {}

  async createBill(input: CreateBillInput): Promise<VendorBill> {
    if (!input.studioId) {
      throw new BillValidationError('studioId is required');
    }
    if (!input.vendorId) {
      throw new BillValidationError('vendorId is required');
    }
    if (typeof input.amountPaise !== 'bigint' || input.amountPaise <= 0n) {
      throw new BillValidationError('Bill amount must be a positive bigint paise', {
        amountPaise: input.amountPaise,
      });
    }
    if (!isValidCalendarDate(input.dueDate)) {
      throw new BillValidationError(`Invalid due date calendar format: "${input.dueDate}"`, {
        dueDate: input.dueDate,
      });
    }

    const vendor = await this.vendorRepo.findById(input.studioId, input.vendorId);
    if (!vendor) {
      throw new VendorNotFoundError(input.vendorId, { studioId: input.studioId });
    }

    const bill: VendorBill = {
      id: randomUUID(),
      studioId: input.studioId,
      vendorId: input.vendorId,
      linkedProjectId: input.linkedProjectId ?? null,
      amountPaise: input.amountPaise,
      dueDate: input.dueDate,
      notes: input.notes?.trim() || null,
      createdAt: todayInKolkata(),
    };

    await this.billRepo.insert(bill);
    return bill;
  }

  async recordPayment(input: RecordVendorPaymentInput): Promise<{
    payment: VendorPayment;
    remainingPayablePaise: bigint;
    status: BillStatus;
  }> {
    if (!input.studioId) {
      throw new BillValidationError('studioId is required');
    }
    if (!input.billId) {
      throw new BillValidationError('billId is required');
    }
    if (typeof input.amountPaise !== 'bigint' || input.amountPaise <= 0n) {
      throw new BillValidationError('Payment amount must be a positive bigint paise', {
        amountPaise: input.amountPaise,
      });
    }
    if (!isValidCalendarDate(input.paidOn)) {
      throw new BillValidationError(`Invalid paidOn calendar date: "${input.paidOn}"`, {
        paidOn: input.paidOn,
      });
    }

    const bill = await this.billRepo.findById(input.studioId, input.billId);
    if (!bill) {
      throw new BillNotFoundError(input.billId, { studioId: input.studioId });
    }

    const existingPayments = await this.paymentRepo.listByBill(input.studioId, input.billId);
    const existingPaid = existingPayments.reduce((acc, p) => acc + p.amountPaise, 0n);
    const remainingBefore = bill.amountPaise - existingPaid;

    if (remainingBefore <= 0n) {
      throw new BillOverpaymentError(
        `Bill "${input.billId}" is already fully settled. No additional payment can be recorded.`,
        { billId: input.billId, amountPaise: input.amountPaise },
      );
    }

    if (input.amountPaise > remainingBefore) {
      throw new BillOverpaymentError(
        `Payment amount of ${input.amountPaise.toString()} paise exceeds the remaining payable of ${remainingBefore.toString()} paise`,
        {
          billId: input.billId,
          requestedPaymentPaise: input.amountPaise,
          remainingPayablePaise: remainingBefore,
        },
      );
    }

    const payment: VendorPayment = {
      id: randomUUID(),
      studioId: input.studioId,
      billId: input.billId,
      amountPaise: input.amountPaise,
      paidOn: input.paidOn,
      paymentMode: input.paymentMode ?? 'UPI',
      transactionUtrRef: input.transactionUtrRef?.trim() || null,
      notes: input.notes?.trim() || null,
      createdAt: todayInKolkata(),
    };

    await this.paymentRepo.insert(payment);

    const updatedPayments = [...existingPayments, payment];
    const newRemaining = calculateRemainingPayable(bill.amountPaise, updatedPayments);
    const newStatus = calculateBillStatus(bill.amountPaise, updatedPayments);

    return {
      payment,
      remainingPayablePaise: newRemaining,
      status: newStatus,
    };
  }

  async getBillDetails(studioId: string, billId: string): Promise<{
    bill: VendorBill;
    payments: VendorPayment[];
    totalPaidPaise: bigint;
    remainingPayablePaise: bigint;
    status: BillStatus;
  }> {
    const bill = await this.billRepo.findById(studioId, billId);
    if (!bill) {
      throw new BillNotFoundError(billId, { studioId });
    }

    const payments = await this.paymentRepo.listByBill(studioId, billId);
    const totalPaidPaise = payments.reduce((acc, p) => acc + p.amountPaise, 0n);
    const remainingPayablePaise = calculateRemainingPayable(bill.amountPaise, payments);
    const status = calculateBillStatus(bill.amountPaise, payments);

    return {
      bill,
      payments,
      totalPaidPaise,
      remainingPayablePaise,
      status,
    };
  }

  async getPayablesAging(studioId: string, asOfDate: string): Promise<PayablesAgingReport> {
    const bills = await this.billRepo.listByStudio(studioId);
    const vendors = await this.vendorRepo.listByStudio(studioId);
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    const records: BillWithPayments[] = [];
    for (const bill of bills) {
      const payments = await this.paymentRepo.listByBill(studioId, bill.id);
      records.push({
        bill,
        vendorName: vendorMap.get(bill.vendorId) ?? 'Unknown Vendor',
        payments,
      });
    }

    return generatePayablesAgingReport(asOfDate, records);
  }

  async getProjectActualCosts(studioId: string, projectId: string): Promise<{
    bills: VendorBill[];
    totalActualCostPaise: bigint;
    remainingPayablePaise: bigint;
  }> {
    const bills = await this.billRepo.listByProject(studioId, projectId);
    let totalActualCostPaise = 0n;
    let totalPaidPaise = 0n;

    for (const bill of bills) {
      totalActualCostPaise += bill.amountPaise;
      const payments = await this.paymentRepo.listByBill(studioId, bill.id);
      totalPaidPaise += payments.reduce((acc, p) => acc + p.amountPaise, 0n);
    }

    const remainingPayablePaise = totalActualCostPaise - totalPaidPaise;

    return {
      bills,
      totalActualCostPaise,
      remainingPayablePaise: remainingPayablePaise < 0n ? 0n : remainingPayablePaise,
    };
  }
}
