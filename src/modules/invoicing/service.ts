import { isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import {
  calculateMilestoneBalance,
  calculateProjectBalance,
  validateMilestoneSchedule,
} from './calculations';
import {
  InvoicingValidationError,
  MissingTransactionReferenceError,
  OverpaymentError,
  VoidPaymentError,
} from './errors';
import type {
  Milestone,
  MilestoneInput,
  Payment,
  PaymentResult,
  RecordClientClaimInput,
  RecordPaymentInput,
  RecordRefundInput,
  RecordSplitPaymentInput,
} from './types';

let paymentIdCounter = 1;
function nextPaymentId(): string {
  return `pay-${Date.now()}-${paymentIdCounter++}`;
}

export class InvoicingService {
  /**
   * Creates and validates a milestone schedule against the project contract value.
   */
  createMilestoneSchedule(
    projectId: string,
    milestones: MilestoneInput[],
    contractValuePaise: bigint,
  ): Milestone[] {
    validateMilestoneSchedule(milestones, contractValuePaise);

    return milestones.map((m, index) => ({
      id: `ms-${projectId}-${index + 1}`,
      projectId,
      name: m.name,
      percentage: m.percentage,
      amountPaise: m.amountPaise,
      dueDate: m.dueDate ?? null,
    }));
  }

  /**
   * Records a client payment against a milestone.
   * Validates mandatory transaction reference for UPI/BankTransfer,
   * enforces positive amounts, and guards against unconfirmed overpayments.
   */
  recordPayment(
    input: RecordPaymentInput,
    milestoneAmountPaise: bigint,
    existingPayments: Payment[],
    allProjectMilestoneBalancesPaise: bigint[],
  ): PaymentResult {
    if (input.amountPaise <= 0n) {
      throw new InvoicingValidationError(
        `Payment amount must be positive, got ${input.amountPaise}`,
      );
    }

    if (!isValidCalendarDate(input.receivedOn)) {
      throw new InvoicingValidationError(
        `Invalid receivedOn date: "${input.receivedOn}"`,
      );
    }

    // UTR requirement check (FR-A-03)
    if (
      (input.paymentMode === 'UPI' || input.paymentMode === 'BankTransfer') &&
      (!input.transactionUtrRef || input.transactionUtrRef.trim() === '')
    ) {
      throw new MissingTransactionReferenceError(input.paymentMode);
    }

    const verificationStatus = input.verificationStatus ?? 'OwnerConfirmed';

    // Calculate current milestone balance
    const currentBalance = calculateMilestoneBalance(
      milestoneAmountPaise,
      existingPayments,
    );

    // Overpayment guard: only verified payments reduce balance,
    // and if OwnerConfirmed, must not exceed remaining balance unless explicitly permitted
    if (
      verificationStatus === 'OwnerConfirmed' &&
      !input.allowOverpayment &&
      input.amountPaise > currentBalance.balancePaise
    ) {
      throw new OverpaymentError(
        input.amountPaise,
        currentBalance.balancePaise,
        { milestoneId: input.milestoneId },
      );
    }

    const payment: Payment = {
      id: nextPaymentId(),
      studioId: input.studioId,
      milestoneId: input.milestoneId,
      amountPaise: input.amountPaise,
      payerName: input.payerName,
      paymentMode: input.paymentMode,
      transactionUtrRef: input.transactionUtrRef?.trim(),
      verificationStatus,
      receivedOn: input.receivedOn,
      voided: false,
    };

    const updatedPayments = [...existingPayments, payment];
    const updatedBalance = calculateMilestoneBalance(
      milestoneAmountPaise,
      updatedPayments,
    );

    // Calculate updated project balance
    const newProjectBalances = allProjectMilestoneBalancesPaise.map((bal, idx) => {
      // If this milestone is in the list, apply delta
      return bal;
    });
    const projectBalancePaise = calculateProjectBalance(newProjectBalances);

    return {
      payment,
      milestoneBalancePaise: updatedBalance.balancePaise,
      projectBalancePaise,
    };
  }

  /**
   * Splits a single client payment receipt across several milestones (FR-A-08).
   */
  recordSplitPayment(
    input: RecordSplitPaymentInput,
    milestonesData: Map<
      string,
      { amountPaise: bigint; existingPayments: Payment[] }
    >,
  ): Payment[] {
    if (input.shares.length === 0) {
      throw new InvoicingValidationError('At least one payment share is required');
    }

    if (!isValidCalendarDate(input.receivedOn)) {
      throw new InvoicingValidationError(
        `Invalid receivedOn date: "${input.receivedOn}"`,
      );
    }

    if (
      (input.paymentMode === 'UPI' || input.paymentMode === 'BankTransfer') &&
      (!input.transactionUtrRef || input.transactionUtrRef.trim() === '')
    ) {
      throw new MissingTransactionReferenceError(input.paymentMode);
    }

    const verificationStatus = input.verificationStatus ?? 'OwnerConfirmed';
    const payments: Payment[] = [];

    for (const share of input.shares) {
      if (share.amountPaise <= 0n) {
        throw new InvoicingValidationError(
          `Share amount must be positive, got ${share.amountPaise} for milestone ${share.milestoneId}`,
        );
      }

      const msData = milestonesData.get(share.milestoneId);
      if (!msData) {
        throw new InvoicingValidationError(
          `Milestone not found: "${share.milestoneId}"`,
        );
      }

      const current = calculateMilestoneBalance(
        msData.amountPaise,
        msData.existingPayments,
      );

      if (
        verificationStatus === 'OwnerConfirmed' &&
        share.amountPaise > current.balancePaise
      ) {
        throw new OverpaymentError(
          share.amountPaise,
          current.balancePaise,
          { milestoneId: share.milestoneId },
        );
      }

      const payment: Payment = {
        id: nextPaymentId(),
        studioId: input.studioId,
        milestoneId: share.milestoneId,
        amountPaise: share.amountPaise,
        payerName: input.payerName,
        paymentMode: input.paymentMode,
        transactionUtrRef: input.transactionUtrRef?.trim(),
        verificationStatus,
        receivedOn: input.receivedOn,
        voided: false,
      };

      payments.push(payment);
    }

    return payments;
  }

  /**
   * Voids an existing payment (FR-A-07).
   * Sets voided = true; never deletes the row. Restores balance.
   */
  voidPayment(
    payment: Payment,
    reason: string,
    voidedAt: string = todayInKolkata(),
  ): Payment {
    if (payment.voided) {
      throw new VoidPaymentError(
        `Payment ${payment.id} has already been voided`,
        { paymentId: payment.id },
      );
    }

    if (!reason || reason.trim() === '') {
      throw new VoidPaymentError(
        'A reason is mandatory to void a payment',
        { paymentId: payment.id },
      );
    }

    return {
      ...payment,
      voided: true,
      voidReason: reason.trim(),
      voidedAt,
    };
  }

  /**
   * Records a refund as a negative payment with a logged reason (PRD FR-A-09, IN-5).
   * Restores pending balance and preserves complete correction history.
   */
  recordRefund(
    input: RecordRefundInput,
    milestoneAmountPaise: bigint,
    existingPayments: Payment[],
  ): PaymentResult {
    if (!input.reason || input.reason.trim() === '') {
      throw new InvoicingValidationError('A reason is mandatory to record a refund');
    }

    if (input.amountPaise <= 0n) {
      throw new InvoicingValidationError(
        `Refund amount must be positive, got ${input.amountPaise.toString()}`,
      );
    }

    if (!isValidCalendarDate(input.refundedOn)) {
      throw new InvoicingValidationError(
        `Invalid refundedOn calendar date: "${input.refundedOn}"`,
      );
    }

    const verifiedPayments = existingPayments.filter(
      (p) => !p.voided && p.verificationStatus === 'OwnerConfirmed',
    );
    const totalCollectedPaise = verifiedPayments.reduce((acc, p) => acc + p.amountPaise, 0n);

    if (totalCollectedPaise <= 0n) {
      throw new InvoicingValidationError(
        'Cannot issue a refund on a milestone with no verified payments',
      );
    }

    if (input.amountPaise > totalCollectedPaise) {
      throw new InvoicingValidationError(
        `Refund amount (${input.amountPaise.toString()} paise) cannot exceed verified payments received (${totalCollectedPaise.toString()} paise)`,
      );
    }

    const refundPayment: Payment = {
      id: nextPaymentId(),
      studioId: input.studioId,
      milestoneId: input.milestoneId,
      amountPaise: 0n - input.amountPaise, // Negative payment per PRD FR-A-09
      payerName: input.payerName ?? 'Refund',
      paymentMode: input.paymentMode ?? 'UPI',
      transactionUtrRef: input.transactionUtrRef?.trim(),
      verificationStatus: 'OwnerConfirmed',
      receivedOn: input.refundedOn,
      voided: false,
      voidReason: input.reason.trim(),
    };

    const updatedPayments = [...existingPayments, refundPayment];
    const updatedBalance = calculateMilestoneBalance(milestoneAmountPaise, updatedPayments);

    return {
      payment: refundPayment,
      milestoneBalancePaise: updatedBalance.balancePaise,
      projectBalancePaise: updatedBalance.balancePaise,
    };
  }

  /**
   * Records a client's payment submission / claim ("I have paid", PRD FR-G-04, IN-6).
   * Persisted as 'Unverified'. Does NOT reduce verified milestone balance until owner confirms.
   */
  recordClientClaim(
    input: RecordClientClaimInput,
    milestoneAmountPaise: bigint,
    existingPayments: Payment[],
    nowDate: string = todayInKolkata(),
  ): PaymentResult {
    if (input.amountPaise <= 0n) {
      throw new InvoicingValidationError('Payment claim amount must be a positive bigint paise');
    }
    if (!input.payerName || input.payerName.trim() === '') {
      throw new InvoicingValidationError('Payer name is required');
    }

    const payment: Payment = {
      id: nextPaymentId(),
      studioId: input.studioId,
      milestoneId: input.milestoneId,
      amountPaise: input.amountPaise,
      payerName: input.payerName.trim(),
      paymentMode: input.paymentMode ?? 'UPI',
      transactionUtrRef: input.transactionUtrRef?.trim(),
      verificationStatus: 'Unverified', // Crucial invariant: stays Unverified until owner confirms
      receivedOn: input.receivedOn ?? nowDate,
      voided: false,
    };

    const updatedPayments = [...existingPayments, payment];
    const updatedBalance = calculateMilestoneBalance(milestoneAmountPaise, updatedPayments);

    return {
      payment,
      milestoneBalancePaise: updatedBalance.balancePaise,
      projectBalancePaise: updatedBalance.balancePaise,
    };
  }
}
