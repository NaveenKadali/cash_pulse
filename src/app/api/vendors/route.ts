import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

const vendorsStore: any[] = [
  { id: 'ven-001', studioId: 'studio-aarav-001', name: 'Prime Album Print Lab', category: 'Printing', phone: '+919876543220', upiHandle: 'primealbums@icici' },
  { id: 'ven-002', studioId: 'studio-aarav-001', name: 'Delhi Crane & Lighting', category: 'Equipment Rental', phone: '+919876543221', upiHandle: 'delhicrane@hdfc' },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  return apiSuccess(vendorsStore);
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.name || !body.category) {
      return apiError('VALIDATION_FAILED', 'name and category are required', 400);
    }

    const newVendor = {
      id: `ven-${randomUUID().slice(0, 8)}`,
      studioId: user!.studioId,
      name: body.name,
      category: body.category,
      phone: body.phone || null,
      upiHandle: body.upiHandle || null,
    };
    vendorsStore.push(newVendor);
    return apiSuccess(newVendor, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
