import { describe, expect, it } from 'vitest';
import { createPaymentGatewayAdapter, SandboxPaymentGatewayAdapter } from '../../src/adapters/payment/index.js';

describe('Payment Gateway Adapter (K7)', () => {
  it('creates SandboxPaymentGatewayAdapter in test environment', () => {
    const adapter = createPaymentGatewayAdapter('test');
    expect(adapter).toBeInstanceOf(SandboxPaymentGatewayAdapter);
  });

  it('creates payment order and returns active session link', async () => {
    const adapter = new SandboxPaymentGatewayAdapter();
    const result = await adapter.createPaymentOrder({
      orderId: 'ord-123',
      amountPaise: 5000000n,
      customerName: 'Aarav Mehta',
      customerPhone: '+919876543210',
    });

    expect(result.orderId).toBe('ord-123');
    expect(result.paymentSessionId).toContain('ord-123');
    expect(result.paymentLink).toContain('sandbox.cashpulse.local/pay/');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects zero or negative payment order amounts', async () => {
    const adapter = new SandboxPaymentGatewayAdapter();
    await expect(
      adapter.createPaymentOrder({
        orderId: 'ord-bad',
        amountPaise: 0n,
      }),
    ).rejects.toThrow('Payment order amount must be positive');
  });

  it('verifies pending and simulated successful payment', async () => {
    const adapter = new SandboxPaymentGatewayAdapter();
    await adapter.createPaymentOrder({
      orderId: 'ord-sim',
      amountPaise: 2500000n,
    });

    const pending = await adapter.verifyPayment('ord-sim');
    expect(pending.status).toBe('PENDING');

    adapter.simulatePaymentSuccess('ord-sim', 'UTR998877');
    const success = await adapter.verifyPayment('ord-sim');
    expect(success.status).toBe('SUCCESS');
    expect(success.transactionRef).toBe('UTR998877');
    expect(success.settledAt).toBeDefined();
  });

  it('builds canonical NPCI compliant UPI deep-links', () => {
    const adapter = new SandboxPaymentGatewayAdapter();
    const link = adapter.buildUpiLink({
      vpa: 'aaravpixels@okhdfcbank',
      payeeName: 'Aarav Pixels',
      amountPaise: 15000000n,
      transactionRef: 'INV-2026-001',
      note: 'Wedding Photography Advance',
    });

    expect(link).toContain('upi://pay?');
    expect(link).toContain('pa=aaravpixels%40okhdfcbank');
    expect(link).toContain('am=150000.00');
    expect(link).toContain('cu=INR');
    expect(link).toContain('tr=INV-2026-001');
  });
});
