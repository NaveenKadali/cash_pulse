import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { generateClientToken, hashClientToken } from '@/modules/client-portal/tokens';
import { randomUUID } from 'node:crypto';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { projectId } = await params;
  const rawToken = generateClientToken();
  const tokenHash = hashClientToken(rawToken);

  const clientLink = {
    id: randomUUID(),
    projectId,
    studioId: user!.studioId,
    tokenHash,
    rawToken, // Shown ONCE in creation response per LLD §3.14
    url: `/p/${rawToken}`,
    status: 'Active',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  return apiSuccess(clientLink, 201);
}
