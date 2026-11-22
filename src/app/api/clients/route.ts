import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

const clientsStore = [
  { id: 'client-verma', studioId: 'studio-aarav-001', name: 'Verma Family', whatsappPhone: '+919876543210', city: 'Delhi' },
  { id: 'client-kapoor', studioId: 'studio-aarav-001', name: 'Kapoor Family', whatsappPhone: '+919876543212', city: 'Mumbai' },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  return apiSuccess(clientsStore);
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.name || !body.whatsappPhone) {
      return apiError('VALIDATION_FAILED', 'name and whatsappPhone are required', 400);
    }

    const newClient = {
      id: `client-${randomUUID().slice(0, 8)}`,
      studioId: user!.studioId,
      name: body.name,
      whatsappPhone: body.whatsappPhone,
      city: body.city || 'Delhi',
    };
    clientsStore.push(newClient);
    return apiSuccess(newClient, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
