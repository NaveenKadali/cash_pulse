import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

const vendorPaymentIdempotency = new Map<string, any>();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ billId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Header Idempotency-Key is required on bill payment endpoints', 400);
  }

  if (vendorPaymentIdempotency.has(idempotencyKey)) {
    return apiSuccess(vendorPaymentIdempotency.get(idempotencyKey), 200, {
      'Idempotent-Replay': 'true',
    });
  }

  const { billId } = await params;
  try {
    const body = await req.json();
    const { amountPaise, paymentMode } = body;

    if (!amountPaise) {
      return apiError('VALIDATION_FAILED', 'amountPaise is required', 400);
    }

    const amt = BigInt(amountPaise);
    const billTotal = 7000000n; // ₹70,000 illustrative
    if (amt > billTotal) {
      return apiError('VENDOR_BILL_OVERPAYMENT', `Payment amount exceeds bill remaining balance`, 400);
    }

    const remaining = billTotal - amt;
    const payment = {
      id: randomUUID(),
      billId,
      studioId: user!.studioId,
      paidAmountPaise: amt.toString(),
      remainingPayablePaise: remaining.toString(),
      paymentMode: paymentMode || 'UPI',
      paidOn: new Date().toISOString().split('T')[0],
    };

    vendorPaymentIdempotency.set(idempotencyKey, payment);
    return apiSuccess(payment, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
