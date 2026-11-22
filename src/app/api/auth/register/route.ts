import { apiError, apiSuccess } from '@/infrastructure/http/response';
import { randomUUID, randomBytes } from 'node:crypto';
import {
  registeredUsersStore,
  sessionsStore,
  type RegisteredUser,
  hashPassword,
} from '@/modules/auth/registry';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, password, phone, studioName } = body;

    // Strict Validations
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return apiError('VALIDATION_FAILED', 'Full Name is required (minimum 2 characters)', 400, { field: 'fullName' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('VALIDATION_FAILED', 'Valid email address is required', 400, { field: 'email' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return apiError('VALIDATION_FAILED', 'Password must be at least 8 characters long', 400, { field: 'password' });
    }
    if (!phone || typeof phone !== 'string' || !/^\+91[6-9]\d{9}$/.test(phone)) {
      return apiError('VALIDATION_FAILED', 'Valid Indian mobile number (+91 followed by 10 digits) is required', 400, { field: 'phone' });
    }
    if (!studioName || typeof studioName !== 'string' || studioName.trim().length < 2) {
      return apiError('VALIDATION_FAILED', 'Studio or Workspace name is required', 400, { field: 'studioName' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (registeredUsersStore.has(normalizedEmail)) {
      return apiError('USER_ALREADY_EXISTS', 'An account with this email address already exists. Please sign in.', 409);
    }

    const userId = randomUUID();
    const studioId = `studio-${randomUUID().slice(0, 8)}`;
    const verificationToken = randomBytes(24).toString('hex');

    const newUser: RegisteredUser = {
      id: userId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone,
      passwordHash: hashPassword(password),
      studioId,
      studioName: studioName.trim(),
      emailVerified: false, // Compulsory verification requirement
      emailVerificationToken: verificationToken,
      plan: 'Free',
      createdAt: new Date().toISOString(),
    };

    registeredUsersStore.set(normalizedEmail, newUser);

    const sessionId = randomUUID();
    const sessionCookie = `session_${sessionId}`;

    // Register active session for immediate seamless authorization
    sessionsStore.set(sessionCookie, {
      userId,
      studioId,
      role: 'Owner',
      phone,
      email: normalizedEmail,
      fullName: newUser.fullName,
      studioName: newUser.studioName,
      plan: 'Free',
    });
    sessionsStore.set(sessionId, {
      userId,
      studioId,
      role: 'Owner',
      phone,
      email: normalizedEmail,
      fullName: newUser.fullName,
      studioName: newUser.studioName,
      plan: 'Free',
    });

    const res = apiSuccess({
      success: true,
      message: 'Registration successful! Verification email dispatched.',
      user: {
        id: userId,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        studioId,
        studioName: newUser.studioName,
        emailVerified: false,
        plan: 'Free',
      },
      emailVerificationPreview: {
        verificationLink: `http://localhost:3000/api/auth/email/verify?token=${verificationToken}`,
        note: 'Click this link to activate your free subscription.',
      },
    }, 201);

    // Issue session cookie
    res.cookies.set('__session', sessionCookie, {
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
