import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { expenseId } = await params;
  try {
    const body = await req.json();
    return apiSuccess({
      id: expenseId,
      studioId: user!.studioId,
      category: body.category || 'Studio Rent',
      amountPaise: body.amountPaise || '2500000',
      dueDayOfMonth: body.dueDayOfMonth || 10,
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
