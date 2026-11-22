import { addDays, daysBetween, isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import {
  InvoicingValidationError,
  MilestoneSumMismatchError,
} from './errors';
import type {
  AgingBucket,
  AgingSummary,
  AgingSummaryItem,
  Milestone,
  MilestoneInput,
  UpiLinkOptions,
  VerificationStatus,
} from './types';

/**
 * Generates the default 30% / 40% / 30% milestone schedule.
 * Exact integer paise arithmetic guarantees that milestone amounts sum exactly to contractValuePaise.
 */
export function generateDefaultMilestoneSchedule(
  contractValuePaise: bigint,
  eventDate?: string,
  projectId: string = '',
): Milestone[] {
  if (contractValuePaise <= 0n) {
    throw new InvoicingValidationError(
      `Contract value must be positive, got ${contractValuePaise}`,
    );
  }

  if (eventDate && !isValidCalendarDate(eventDate)) {
    throw new InvoicingValidationError(
      `Invalid eventDate: "${eventDate}"`,
    );
  }

  // 30% Advance (rounded half-up)
  const advancePaise = (contractValuePaise * 30n + 50n) / 100n;
  // 40% Shoot day (rounded half-up)
  const shootPaise = (contractValuePaise * 40n + 50n) / 100n;
  // 30% Final balance: computed as remainder to ensure exact sum without off-by-one paise errors
  const finalBalancePaise = contractValuePaise - advancePaise - shootPaise;

  const shootDate = eventDate ?? null;
  const finalBalanceDate = eventDate ? addDays(eventDate, 30) : null;

  return [
    {
      id: 'default-advance',
      projectId,
      name: 'Booking Advance',
      percentage: 30,
      amountPaise: advancePaise,
      dueDate: shootDate ? addDays(shootDate, -30) : null,
    },
    {
      id: 'default-shoot',
      projectId,
      name: 'Shoot Completed',
      percentage: 40,
      amountPaise: shootPaise,
      dueDate: shootDate,
    },
    {
      id: 'default-delivery',
      projectId,
      name: 'Delivery Balance',
      percentage: 30,
      amountPaise: finalBalancePaise,
      dueDate: finalBalanceDate,
    },
  ];
}

/**
 * Validates a custom milestone schedule against the project contract value.
 */
export function validateMilestoneSchedule(
  milestones: MilestoneInput[],
  contractValuePaise: bigint,
): void {
  if (milestones.length === 0) {
    throw new InvoicingValidationError('At least one milestone is required');
  }

  let totalPaise = 0n;
  for (const m of milestones) {
    if (m.amountPaise <= 0n) {
      throw new InvoicingValidationError(
        `Milestone amount must be positive, got ${m.amountPaise} for "${m.name}"`,
      );
    }
    if (m.dueDate && !isValidCalendarDate(m.dueDate)) {
      throw new InvoicingValidationError(
        `Invalid dueDate "${m.dueDate}" for milestone "${m.name}"`,
      );
    }
    totalPaise += m.amountPaise;
  }

  if (totalPaise !== contractValuePaise) {
    throw new MilestoneSumMismatchError(totalPaise, contractValuePaise);
  }
}

/**
 * Rule 1: Milestone balance
 * milestoneBalance(m) = m.amount − Σ p.amount for p in payments(m) where p.voided = false and p.verificationStatus = OwnerConfirmed
 */
export function calculateMilestoneBalance(
  milestoneAmountPaise: bigint,
  payments: Array<{
    amountPaise: bigint;
    voided: boolean;
    verificationStatus: VerificationStatus;
  }>,
): { balancePaise: bigint; verifiedCollectedPaise: bigint; unverifiedPendingPaise: bigint } {
  let verifiedCollectedPaise = 0n;
  let unverifiedPendingPaise = 0n;

  for (const p of payments) {
    if (p.voided) continue;
    if (p.verificationStatus === 'OwnerConfirmed') {
      verifiedCollectedPaise += p.amountPaise;
    } else if (p.verificationStatus === 'Unverified') {
      unverifiedPendingPaise += p.amountPaise;
    }
  }

  const balancePaise = milestoneAmountPaise - verifiedCollectedPaise;
  return {
    balancePaise,
    verifiedCollectedPaise,
    unverifiedPendingPaise,
  };
}

/**
 * Rule 2: Project balance
 * projectBalance(proj) = Σ milestoneBalance(m) for m in milestones(proj)
 */
export function calculateProjectBalance(
  milestoneBalancesPaise: bigint[],
): bigint {
  let total = 0n;
  for (const b of milestoneBalancesPaise) {
    total += b;
  }
  return total;
}

/**
 * Rule 3: Days overdue (Asia/Kolkata calendar day)
 * daysOverdue(m) = 0 if m.due_date is NULL or milestoneBalance(m) = 0
 *                = max(0, today − m.due_date) in days otherwise
 */
export function calculateDaysOverdue(
  dueDate: string | null,
  balancePaise: bigint,
  asOfDate: string = todayInKolkata(),
): number {
  if (dueDate === null || balancePaise <= 0n) {
    return 0;
  }
  if (!isValidCalendarDate(dueDate)) {
    throw new InvoicingValidationError(`Invalid dueDate: "${dueDate}"`);
  }
  if (!isValidCalendarDate(asOfDate)) {
    throw new InvoicingValidationError(`Invalid asOfDate: "${asOfDate}"`);
  }
  const diffDays = daysBetween(dueDate, asOfDate);
  return Math.max(0, diffDays);
}

/**
 * Rule 4: Aging buckets (by daysOverdue)
 * bucket(d) = "0"     if d = 0
 *           = "1–15"  if 1 ≤ d ≤ 15
 *           = "16–30" if 16 ≤ d ≤ 30
 *           = "31–60" if 31 ≤ d ≤ 60
 *           = "61+"   if d ≥ 61
 */
export function classifyAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue === 0) return '0';
  if (daysOverdue <= 15) return '1–15';
  if (daysOverdue <= 30) return '16–30';
  if (daysOverdue <= 60) return '31–60';
  return '61+';
}

/**
 * Summarizes receivables aging across a list of milestones with open balances.
 */
export function buildAgingSummary(
  milestones: Array<{
    id: string;
    projectId: string;
    name: string;
    dueDate: string | null;
    balancePaise: bigint;
  }>,
  asOfDate: string = todayInKolkata(),
): AgingSummary {
  const buckets: Record<AgingBucket, bigint> = {
    '0': 0n,
    '1–15': 0n,
    '16–30': 0n,
    '31–60': 0n,
    '61+': 0n,
  };

  let totalOutstandingPaise = 0n;
  let totalOverduePaise = 0n;
  const items: AgingSummaryItem[] = [];

  for (const m of milestones) {
    if (m.balancePaise <= 0n) continue;

    totalOutstandingPaise += m.balancePaise;
    const daysOverdue = calculateDaysOverdue(m.dueDate, m.balancePaise, asOfDate);
    const bucket = classifyAgingBucket(daysOverdue);

    buckets[bucket] += m.balancePaise;
    if (daysOverdue > 0) {
      totalOverduePaise += m.balancePaise;
    }

    items.push({
      milestoneId: m.id,
      projectId: m.projectId,
      milestoneName: m.name,
      dueDate: m.dueDate,
      daysOverdue,
      bucket,
      balancePaise: m.balancePaise,
    });
  }

  return {
    buckets,
    totalOutstandingPaise,
    totalOverduePaise,
    items,
  };
}

/**
 * FR-G-03: Generates a UPI Deep Link compliant with the Indian National Payments Corporation (NPCI) UPI specs.
 * upi://pay?pa=<studio-upi-id>&pn=<studio-name>&am=<amount>&tn=<note>&cu=INR
 */
export function buildUpiDeepLink(options: UpiLinkOptions): string {
  if (!options.payeeUpiId || !options.payeeUpiId.includes('@')) {
    throw new InvoicingValidationError(
      `Invalid payeeUpiId: "${options.payeeUpiId}"`,
    );
  }
  if (options.amountPaise <= 0n) {
    throw new InvoicingValidationError(
      `UPI amount must be positive, got ${options.amountPaise}`,
    );
  }

  const rupees = (options.amountPaise / 100n).toString();
  const paiseFrac = (options.amountPaise % 100n).toString().padStart(2, '0');
  const amountStr = `${rupees}.${paiseFrac}`;

  const query = new URLSearchParams({
    pa: options.payeeUpiId,
    pn: options.payeeName,
    am: amountStr,
    tn: options.transactionNote,
    cu: 'INR',
  });

  return `upi://pay?${query.toString()}`;
}
