import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ milestoneId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const { milestoneId } = await params;
  try {
    const body = await req.json();
    const { dueDate } = body;

    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return apiError('VALIDATION_FAILED', 'Valid dueDate in YYYY-MM-DD format required', 400);
    }

    return apiSuccess({
      milestoneId,
      dueDate,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
