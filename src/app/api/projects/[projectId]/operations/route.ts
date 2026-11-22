import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const { projectId } = await params;
  try {
    const body = await req.json();
    return apiSuccess({
      id: projectId,
      studioId: user!.studioId,
      venueLocation: body.venueLocation || 'Updated Venue',
      primaryContactPerson: body.primaryContactPerson || 'Updated Contact',
      targetAlbumDeliveryDate: body.targetAlbumDeliveryDate || '2026-12-20',
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
