import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess({
    id: user!.studioId,
    name: 'Aarav Pixels',
    timezone: 'Asia/Kolkata',
    plan: user!.plan,
    defaultUpiVpa: 'aaravpixels@okhdfcbank',
    openingCashPaise: '2400000',
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    return apiSuccess({
      id: user!.studioId,
      name: body.name || 'Aarav Pixels',
      timezone: 'Asia/Kolkata',
      plan: user!.plan,
      defaultUpiVpa: body.defaultUpiVpa || 'aaravpixels@okhdfcbank',
      openingCashPaise: body.openingCashPaise || '2400000',
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
