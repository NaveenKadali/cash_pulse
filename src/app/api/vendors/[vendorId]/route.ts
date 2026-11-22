import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { vendorId } = await params;
  try {
    const body = await req.json();
    return apiSuccess({
      id: vendorId,
      studioId: user!.studioId,
      name: body.name || 'Prime Album Print Lab',
      category: body.category || 'Printing',
      phone: body.phone || '+919876543220',
      upiHandle: body.upiHandle || 'primealbums@icici',
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
