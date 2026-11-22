import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const { clientId } = await params;
  try {
    const body = await req.json();
    return apiSuccess({
      id: clientId,
      studioId: user!.studioId,
      name: body.name || 'Verma Family',
      whatsappPhone: body.whatsappPhone || '+919876543210',
      city: body.city || 'Delhi',
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
