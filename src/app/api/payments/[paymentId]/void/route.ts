import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { paymentId } = await params;
  try {
    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      return apiError('VALIDATION_FAILED', 'Audit reason is required to void a payment', 400);
    }

    return apiSuccess({
      paymentId,
      voided: true,
      voidReason: reason,
      voidedBy: user!.id,
      voidedAt: new Date().toISOString(),
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
