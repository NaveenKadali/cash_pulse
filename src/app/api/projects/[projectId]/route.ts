import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const { projectId } = await params;
  const project = {
    id: projectId,
    studioId: user!.studioId,
    name: 'Verma Wedding',
    clientId: 'client-verma',
    eventType: 'Wedding',
    venueLocation: 'Delhi',
    primaryContactPerson: 'Kavita Verma',
    targetAlbumDeliveryDate: '2026-12-15',
    stage: 'Shoot Completed',
    financialStatus: 'Partially Settled',
    contractValuePaise: 15000000n,
  };

  if (user!.role === 'Team Member') {
    // Operations view: scrub money fields
    const { contractValuePaise, financialStatus, ...opsView } = project;
    return apiSuccess(opsView);
  }

  return apiSuccess({
    ...project,
    contractValuePaise: project.contractValuePaise.toString(),
  });
}
