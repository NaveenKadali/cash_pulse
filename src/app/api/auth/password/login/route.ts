import { apiError, apiSuccess } from '@/infrastructure/http/response';
import { registeredUsersStore, verifyPassword } from '@/modules/auth/registry';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('VALIDATION_FAILED', 'Email and password are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = registeredUsersStore.get(normalizedEmail);

    // Fallback demo credentials check
    const isDemo = normalizedEmail === 'aarav@aaravpixels.com' && password === 'Password@123';

    if (!user && !isDemo) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user && !verifyPassword(password, user.passwordHash)) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const sessionId = randomUUID();
    const res = apiSuccess({
      success: true,
      user: {
        id: user ? user.id : 'user-owner-001',
        email: normalizedEmail,
        fullName: user ? user.fullName : 'Aarav Sharma',
        studioId: user ? user.studioId : 'studio-aarav-001',
        studioName: user ? user.studioName : 'Aarav Pixels',
        emailVerified: user ? user.emailVerified : true,
        plan: user ? user.plan : 'Free',
      },
    });

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
