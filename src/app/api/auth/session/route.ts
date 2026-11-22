import { apiError, apiSuccess, getSessionUser } from '@/infrastructure/http/response';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHENTICATED', 'No active session found', 401);
  }

  return apiSuccess({
    sessionId: 'session_active',
    user,
    studioId: user.studioId,
    active: true,
  });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser(req);
  const res = apiSuccess({
    sessionId: null,
    user: null,
    active: false,
  });

  res.cookies.delete('__session');
  return res;
}
