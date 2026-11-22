import type { Paise } from '../../infrastructure/money';

export type PaymentMode = 'UPI' | 'BankTransfer' | 'Cash' | 'Other';
export type VerificationStatus = 'OwnerConfirmed' | 'Unverified';

export type AgingBucket = '0' | '1–15' | '16–30' | '31–60' | '61+';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  percentage: number;
  amountPaise: bigint;
  dueDate: string | null; // YYYY-MM-DD
}

export interface MilestoneInput {
  name: string;
  percentage: number;
  amountPaise: bigint;
  dueDate?: string | null;
}

export interface Payment {
  id: string;
  studioId: string;
  milestoneId: string;
  amountPaise: bigint;
  payerName: string;
  paymentMode: PaymentMode;
  transactionUtrRef?: string;
  verificationStatus: VerificationStatus;
  receivedOn: string; // YYYY-MM-DD
  voided: boolean;
  voidReason?: string;
  voidedAt?: string;
}

export interface RecordPaymentInput {
  studioId: string;
  milestoneId: string;
  amountPaise: bigint;
  payerName: string;
  paymentMode: PaymentMode;
  transactionUtrRef?: string;
  receivedOn: string;
  verificationStatus?: VerificationStatus; // default OwnerConfirmed
  allowOverpayment?: boolean; // default false
}

export interface SplitPaymentShareInput {
  milestoneId: string;
  amountPaise: bigint;
}

export interface RecordSplitPaymentInput {
  studioId: string;
  payerName: string;
  paymentMode: PaymentMode;
  transactionUtrRef?: string;
  receivedOn: string;
  verificationStatus?: VerificationStatus;
  shares: SplitPaymentShareInput[];
}

export interface PaymentResult {
  payment: Payment;
  milestoneBalancePaise: bigint;
  projectBalancePaise: bigint;
}

export interface AgingSummaryItem {
  milestoneId: string;
  projectId: string;
  milestoneName: string;
  dueDate: string | null;
  daysOverdue: number;
  bucket: AgingBucket;
  balancePaise: bigint;
}

export interface AgingSummary {
  buckets: Record<AgingBucket, bigint>;
  totalOutstandingPaise: bigint;
  totalOverduePaise: bigint;
  items: AgingSummaryItem[];
}

export interface UpiLinkOptions {
  payeeUpiId: string;
  payeeName: string;
  amountPaise: bigint;
  transactionNote: string;
}


export interface RecordRefundInput {
  studioId: string;
  milestoneId: string;
  amountPaise: bigint; // positive refund amount
  reason: string;
  refundedOn: string; // YYYY-MM-DD
  payerName?: string;
  paymentMode?: PaymentMode;
  transactionUtrRef?: string;
}


export interface RecordClientClaimInput {
  studioId: string;
  milestoneId: string;
  amountPaise: bigint;
  payerName: string;
  transactionUtrRef?: string;
  paymentMode?: PaymentMode;
  receivedOn?: string;
}
