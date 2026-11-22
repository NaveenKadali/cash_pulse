import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess({
    studioId: user!.studioId,
    availableCashPaise: '2400000',
    runwayDays: 14,
    totalOverdueReceivablesPaise: '4500000',
    totalUpcomingPayablesPaise: '7000000',
    unverifiedPaymentsCount: 1,
    activeAlertsCount: 1,
    morningBrief: {
      greeting: 'Good morning, Aarav',
      warning: 'Day 14 Shortfall Warning: Print Lab bill of ₹70,000 due. Collect Verma Wedding milestone to maintain positive liquidity.',
    },
    debtorRadar: [
      {
        clientId: 'client-verma',
        clientName: 'Verma Family',
        milestoneName: 'Post-Shoot Cut',
        balancePaise: '4500000',
        dueDate: '2026-11-10',
        daysOverdue: 10,
        bucket: '1–15',
      },
    ],
  });
}
