import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('VALIDATION_FAILED', 'Valid email address required', 400, {
        field: 'email',
      });
    }

    const sessionId = randomUUID();
    const res = apiSuccess({
      sessionId,
      user: {
        id: randomUUID(),
        email,
        role: 'Owner',
        studioId: 'studio-aarav-001',
      },
      resolvedWorkspace: {
        studioId: 'studio-aarav-001',
        studioName: 'Aarav Pixels',
        role: 'Owner',
        plan: 'Free',
      },
    }, 200);

    res.cookies.set('__session', `session_${sessionId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
