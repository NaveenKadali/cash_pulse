import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { alertId } = await params;
  return apiSuccess({
    id: alertId,
    status: 'Dismissed',
    dismissedBy: user!.id,
    dismissedAt: new Date().toISOString(),
  });
}
