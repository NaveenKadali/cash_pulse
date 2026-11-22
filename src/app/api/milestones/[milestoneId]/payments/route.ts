import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

// Idempotency cache: key -> response
const idempotencyStore = new Map<string, any>();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ milestoneId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const idempotencyKey = req.headers.get('idempotency-key');
  // Strict Invariant: Idempotency-Key header is mandatory on money endpoints (LLD §9.2)
  if (!idempotencyKey) {
    return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Header Idempotency-Key is required on payment endpoints', 400);
  }

  if (idempotencyStore.has(idempotencyKey)) {
    return apiSuccess(idempotencyStore.get(idempotencyKey), 200, {
      'Idempotent-Replay': 'true',
    });
  }

  const { milestoneId } = await params;
  try {
    const body = await req.json();
    const { amountPaise, paymentMode, payerName, transactionRef } = body;

    if (!amountPaise) {
      return apiError('VALIDATION_FAILED', 'amountPaise is required', 400);
    }

    const payment = {
      id: randomUUID(),
      milestoneId,
      studioId: user!.studioId,
      amountPaise: BigInt(amountPaise).toString(),
      paymentMode: paymentMode || 'UPI',
      payerName: payerName || 'Client',
      transactionRef: transactionRef ? `****${transactionRef.slice(-4)}` : null, // Masked per LLD §11
      verificationStatus: 'Verified',
      receivedOn: new Date().toISOString().split('T')[0],
      voided: false,
    };

    idempotencyStore.set(idempotencyKey, payment);
    return apiSuccess(payment, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
