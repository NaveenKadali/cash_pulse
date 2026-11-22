import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

const VALID_STAGES = [
  'Booking',
  'Vendor Setup',
  'Shoot Completed',
  'Digital Proofs Ready',
  'Album Layout Approved',
  'Print & Delivered',
  'Financial Closed',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const { projectId } = await params;
  try {
    const body = await req.json();
    const { toStage } = body;

    if (!toStage || !VALID_STAGES.includes(toStage)) {
      return apiError('VALIDATION_FAILED', `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`, 400);
    }

    // Invariant: Stage 7 (Financial Closed) can NEVER be set manually (LLD §2.3, §11)
    if (toStage === 'Financial Closed') {
      return apiError(
        'INVALID_STAGE_TRANSITION',
        'Stage 7 (Financial Closed) is system-derived from financial settlement and cannot be set manually.',
        400,
      );
    }

    return apiSuccess({
      id: projectId,
      stage: toStage,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
