import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { computeRunway } from '@/modules/forecast/engine';

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  try {
    const body = await req.json().catch(() => ({}));
    const horizonDays = body?.horizonDays || 30;

    // Strict Invariant: Free plan capped at 30 days; >30 rejected with PLAN_LIMIT (LLD §7, §11)
    if (user!.plan === 'Free' && horizonDays > 30) {
      return apiError(
        'PLAN_LIMIT',
        'Free plan allows at most 30 days of forecast horizon. Upgrade to Starter to unlock 60 or 90 days.',
        403,
      );
    }

    const forecastResult = computeRunway({
      studioId: user!.studioId,
      plan: user!.plan,
      horizonDays,
      openingBalance: {
        asOfDate: '2026-11-20',
        amountPaise: 2400000n, // ₹24,000
      },
      currentDate: '2026-11-20',
      inflows: [
        {
          id: 'ms-v2',
          projectId: 'proj-verma',
          projectName: 'Verma Wedding',
          milestoneTitle: 'Post-Shoot Cut',
          expectedDate: '2026-11-30',
          amountPaise: 4500000n,
          confidence: 'OwnerConfirmed',
        },
      ],
      outflows: [
        {
          id: 'bill-001',
          category: 'Printing',
          dueDate: '2026-12-04',
          amountPaise: 7000000n,
          kind: 'VendorBill',
          confidence: 'OwnerConfirmed',
        },
      ],
      delayOverrides: body?.delayOverrides || [],
    });

    return apiSuccess({
      lowestBalancePaise: forecastResult.lowestBalancePaise.toString(),
      lowestBalanceDate: forecastResult.lowestBalanceDate,
      days: forecastResult.days.map((d) => ({
        date: d.date,
        balancePaise: d.balancePaise.toString(),
        inflowPaise: d.inflowPaise.toString(),
        outflowPaise: d.outflowPaise.toString(),
      })),
      shortfalls: forecastResult.shortfalls.map((s) => ({
        shortfallDate: s.shortfallDate,
        dayIndex: s.dayIndex,
        shortfallPaise: s.shortfallPaise.toString(),
        coveredPaise: s.coveredPaise.toString(),
        remainingGapPaise: s.remainingGapPaise.toString(),
      })),
    });
  } catch (err) {
    return apiError('VALIDATION_FAILED', err instanceof Error ? err.message : 'Malformed request body', 400);
  }
}
