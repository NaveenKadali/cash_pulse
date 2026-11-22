import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { linkId } = await params;
  return apiSuccess({
    id: linkId,
    status: 'Revoked',
    revokedAt: new Date().toISOString(),
  });
}
