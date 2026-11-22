import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

const recurringStore: any[] = [
  { id: 'rec-001', studioId: 'studio-aarav-001', category: 'Studio Rent', amountPaise: 2500000n, dueDayOfMonth: 10 },
  { id: 'rec-002', studioId: 'studio-aarav-001', category: 'Adobe Creative Cloud', amountPaise: 400000n, dueDayOfMonth: 5 },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess(
    recurringStore.map((r) => ({
      ...r,
      amountPaise: r.amountPaise.toString(),
    })),
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.category || !body.amountPaise || !body.dueDayOfMonth) {
      return apiError('VALIDATION_FAILED', 'category, amountPaise, and dueDayOfMonth are required', 400);
    }

    const newRec = {
      id: `rec-${randomUUID().slice(0, 8)}`,
      studioId: user!.studioId,
      category: body.category,
      amountPaise: BigInt(body.amountPaise),
      dueDayOfMonth: Number(body.dueDayOfMonth),
    };
    recurringStore.push(newRec);

    return apiSuccess({
      ...newRec,
      amountPaise: newRec.amountPaise.toString(),
    }, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
