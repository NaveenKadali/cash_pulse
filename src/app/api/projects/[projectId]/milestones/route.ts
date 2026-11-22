import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { projectId } = await params;
  try {
    const body = await req.json();
    const { contractValuePaise, milestones } = body;

    if (!contractValuePaise || !Array.isArray(milestones) || milestones.length === 0) {
      return apiError('VALIDATION_FAILED', 'contractValuePaise and milestones array are required', 400);
    }

    const totalContract = BigInt(contractValuePaise);
    const sumMilestones = milestones.reduce((sum, m) => sum + BigInt(m.amountPaise), 0n);

    // Strict Invariant: Milestone sums MUST equal contract value (LLD §4.10, §9.1)
    if (sumMilestones !== totalContract) {
      return apiError(
        'MILESTONE_SUM_MISMATCH',
        `Milestone amounts sum to ₹${sumMilestones / 100n}, but contract value is ₹${totalContract / 100n}. Amounts must match exactly.`,
        400,
        {
          expectedPaise: totalContract.toString(),
          actualPaise: sumMilestones.toString(),
        },
      );
    }

    return apiSuccess({
      projectId,
      contractValuePaise: totalContract.toString(),
      milestones: milestones.map((m) => ({
        ...m,
        amountPaise: m.amountPaise.toString(),
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
