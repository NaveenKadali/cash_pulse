export interface PaymentOrderParams {
  orderId: string;
  amountPaise: bigint | number | string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
}

export interface PaymentOrderResult {
  orderId: string;
  paymentSessionId: string;
  paymentLink: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED';
}

export interface PaymentVerificationResult {
  orderId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amountPaise: string;
  transactionRef?: string;
  settledAt?: string;
}

export interface UpiLinkParams {
  vpa: string;
  payeeName: string;
  amountPaise: bigint | number | string;
  transactionRef: string;
  note?: string;
}

export interface PaymentGatewayAdapter {
  createPaymentOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(orderId: string): Promise<PaymentVerificationResult>;
  buildUpiLink(params: UpiLinkParams): string;
}
