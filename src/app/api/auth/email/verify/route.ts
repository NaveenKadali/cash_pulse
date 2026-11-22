import { apiError, apiSuccess } from '@/infrastructure/http/response';
import { registeredUsersStore } from '@/modules/auth/registry';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return apiError('VALIDATION_FAILED', 'Verification token is required', 400);
  }

  // Find user with matching token
  let foundUser = null;
  for (const user of registeredUsersStore.values()) {
    if (user.emailVerificationToken === token) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    return apiError('INVALID_TOKEN', 'Verification token is invalid or has expired', 400);
  }

  // Activate email verification
  foundUser.emailVerified = true;

  // If request is from a browser click, redirect to /app with activation flag
  if (req.headers.get('accept')?.includes('text/html')) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/app?verified=true' },
    });
  }

  return apiSuccess({
    success: true,
    message: 'Email successfully verified! Free subscription activated.',
    email: foundUser.email,
    emailVerified: true,
  });
}
