import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

const billsStore: any[] = [
  {
    id: 'bill-001',
    studioId: 'studio-aarav-001',
    vendorId: 'ven-001',
    vendorName: 'Prime Album Print Lab',
    amountPaise: 7000000n, // ₹70,000
    paidPaise: 0n,
    remainingPaise: 7000000n,
    dueDate: '2026-12-04', // Day 14
    category: 'Printing',
    status: 'Pending',
  },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess(
    billsStore.map((b) => ({
      ...b,
      amountPaise: b.amountPaise.toString(),
      paidPaise: b.paidPaise.toString(),
      remainingPaise: b.remainingPaise.toString(),
    })),
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.vendorId || !body.amountPaise || !body.dueDate) {
      return apiError('VALIDATION_FAILED', 'vendorId, amountPaise, and dueDate are required', 400);
    }

    const amt = BigInt(body.amountPaise);
    const newBill = {
      id: `bill-${randomUUID().slice(0, 8)}`,
      studioId: user!.studioId,
      vendorId: body.vendorId,
      vendorName: body.vendorName || 'Vendor',
      amountPaise: amt,
      paidPaise: 0n,
      remainingPaise: amt,
      dueDate: body.dueDate,
      category: body.category || 'Vendor Cost',
      status: 'Pending',
    };
    billsStore.push(newBill);

    return apiSuccess({
      ...newBill,
      amountPaise: newBill.amountPaise.toString(),
      paidPaise: newBill.paidPaise.toString(),
      remainingPaise: newBill.remainingPaise.toString(),
    }, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
