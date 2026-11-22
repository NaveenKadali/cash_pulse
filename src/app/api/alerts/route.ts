import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';

const alertsStore: any[] = [
  {
    id: 'alt-001',
    studioId: 'studio-aarav-001',
    projectId: 'proj-verma',
    kind: 'cash_deficit',
    status: 'Open',
    title: 'Projected Cash Shortfall',
    message: 'A projected cash deficit of ₹1,000 occurs on 2026-12-04.',
    amountPaise: '100000',
    dueDate: '2026-12-04',
    createdAt: '2026-11-20',
  },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess(alertsStore);
}
