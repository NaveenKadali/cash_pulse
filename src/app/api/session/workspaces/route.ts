import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  return apiSuccess([
    {
      membershipId: 'mem-001',
      studioId: user!.studioId,
      studioName: 'Aarav Pixels',
      role: user!.role,
      plan: user!.plan,
    },
  ]);
}
