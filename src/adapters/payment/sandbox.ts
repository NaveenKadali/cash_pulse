import type { PaymentGatewayAdapter, PaymentOrderParams, PaymentOrderResult, PaymentVerificationResult, UpiLinkParams } from './types.js';

export class SandboxPaymentGatewayAdapter implements PaymentGatewayAdapter {
  private readonly orders = new Map<string, { params: PaymentOrderParams; status: 'ACTIVE' | 'PAID' | 'EXPIRED'; transactionRef?: string }>();

  constructor(private readonly _nodeEnv?: string) {}

  async createPaymentOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    const amount = BigInt(params.amountPaise);
    if (amount <= 0n) {
      throw new Error('Payment order amount must be positive');
    }

    const sessionId = `sandbox_session_${params.orderId}_${Date.now()}`;
    const paymentLink = `https://sandbox.cashpulse.local/pay/${sessionId}`;

    this.orders.set(params.orderId, {
      params,
      status: 'ACTIVE',
    });

    return {
      orderId: params.orderId,
      paymentSessionId: sessionId,
      paymentLink,
      status: 'ACTIVE',
    };
  }

  async verifyPayment(orderId: string): Promise<PaymentVerificationResult> {
    const existing = this.orders.get(orderId);
    if (!existing) {
      return {
        orderId,
        status: 'SUCCESS',
        amountPaise: '0',
        transactionRef: `UPI-REF-${Date.now()}`,
        settledAt: new Date().toISOString(),
      };
    }

    return {
      orderId,
      status: existing.status === 'PAID' ? 'SUCCESS' : 'PENDING',
      amountPaise: existing.params.amountPaise.toString(),
      transactionRef: existing.transactionRef || `UPI-REF-${Date.now()}`,
      settledAt: existing.status === 'PAID' ? new Date().toISOString() : undefined,
    };
  }

  simulatePaymentSuccess(orderId: string, utr?: string): void {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'PAID';
      order.transactionRef = utr || `UTR-SIM-${Date.now()}`;
    }
  }

  buildUpiLink(params: UpiLinkParams): string {
    const amountRupees = (Number(BigInt(params.amountPaise)) / 100).toFixed(2);
    const query = new URLSearchParams({
      pa: params.vpa,
      pn: params.payeeName,
      am: amountRupees,
      cu: 'INR',
      tr: params.transactionRef,
      tn: params.note || `Payment for invoice ${params.transactionRef}`,
    });

    return `upi://pay?${query.toString()}`;
  }
}
