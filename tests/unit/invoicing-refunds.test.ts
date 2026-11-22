import { describe, expect, it } from 'vitest';
import {
  InvoicingService,
  InvoicingValidationError,
  type Payment,
} from '../../src/modules/invoicing/index.js';

describe('Negative Payment Refunds (PRD FR-A-09, IN-5)', () => {
  const STUDIO_ID = 'studio-001';
  const MILESTONE_ID = 'ms-wedding-advance';
  const MILESTONE_AMOUNT = 5000000n; // ₹50,000

  const service = new InvoicingService();

  // -----------------------------------------------------------
  // Positive Refund Flows
  // -----------------------------------------------------------
  describe('recordRefund', () => {
    it('records a full refund as a negative payment and restores milestone pending balance', () => {
      // Milestone ₹50,000 was fully collected
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n,
        payerName: 'Rohan Kapoor',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      const result = service.recordRefund(
        {
          studioId: STUDIO_ID,
          milestoneId: MILESTONE_ID,
          amountPaise: 5000000n, // ₹50,000 refund
          reason: 'Client cancelled booking due to family emergency',
          refundedOn: '2026-11-10',
          paymentMode: 'BankTransfer',
          transactionUtrRef: 'REFUND-UTR-999',
        },
        MILESTONE_AMOUNT,
        [initialPayment],
      );

      // Must be recorded as negative payment per PRD FR-A-09
      expect(result.payment.amountPaise).toBe(-5000000n);
      expect(result.payment.voidReason).toBe(
        'Client cancelled booking due to family emergency',
      );
      expect(result.payment.verificationStatus).toBe('OwnerConfirmed');
      expect(result.payment.receivedOn).toBe('2026-11-10');

      // Milestone pending balance restored back to ₹50,000
      expect(result.milestoneBalancePaise).toBe(5000000n);
    });

    it('records a partial refund against collected advance', () => {
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n, // ₹50,000 paid
        payerName: 'Rohan Kapoor',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      // Refund ₹20,000 (e.g. partial cancellation penalty retained)
      const result = service.recordRefund(
        {
          studioId: STUDIO_ID,
          milestoneId: MILESTONE_ID,
          amountPaise: 2000000n,
          reason: 'Partial refund after ₹30,000 non-refundable cancellation fee',
          refundedOn: '2026-11-12',
        },
        MILESTONE_AMOUNT,
        [initialPayment],
      );

      expect(result.payment.amountPaise).toBe(-2000000n);
      // Net paid is now ₹30,000 -> remaining balance is ₹20,000
      expect(result.milestoneBalancePaise).toBe(2000000n);
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 Ratio)
    // -----------------------------------------------------------
    it('rejects refund when milestone has no collected payments', () => {
      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 1000000n,
            reason: 'Refund',
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [], // No prior payments
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects refund amount exceeding total collected payments', () => {
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 2000000n, // Only ₹20,000 paid
        payerName: 'Rohan',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      // Attempting to refund ₹25,000 when only ₹20,000 was collected
      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 2500000n,
            reason: 'Over-refund attempt',
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects refund when mandatory reason is missing or whitespace', () => {
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n,
        payerName: 'Rohan',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 1000000n,
            reason: '', // Empty
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 1000000n,
            reason: '   ', // Whitespace
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects refund with zero or negative amount', () => {
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n,
        payerName: 'Rohan',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 0n,
            reason: 'Zero refund',
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: -1000n,
            reason: 'Negative input',
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('rejects refund with invalid calendar date', () => {
      const initialPayment: Payment = {
        id: 'pay-1',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n,
        payerName: 'Rohan',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: false,
      };

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 1000000n,
            reason: 'Valid reason',
            refundedOn: '2026-02-31',
          },
          MILESTONE_AMOUNT,
          [initialPayment],
        ),
      ).toThrow(InvoicingValidationError);
    });

    it('does NOT count voided payments when calculating eligible refund ceiling', () => {
      const voidedPayment: Payment = {
        id: 'pay-voided',
        studioId: STUDIO_ID,
        milestoneId: MILESTONE_ID,
        amountPaise: 5000000n,
        payerName: 'Rohan',
        paymentMode: 'UPI',
        verificationStatus: 'OwnerConfirmed',
        receivedOn: '2026-11-01',
        voided: true, // VOIDED
      };

      expect(() =>
        service.recordRefund(
          {
            studioId: STUDIO_ID,
            milestoneId: MILESTONE_ID,
            amountPaise: 1000000n,
            reason: 'Refund',
            refundedOn: '2026-11-10',
          },
          MILESTONE_AMOUNT,
          [voidedPayment],
        ),
      ).toThrow(InvoicingValidationError);
    });
  });
});
