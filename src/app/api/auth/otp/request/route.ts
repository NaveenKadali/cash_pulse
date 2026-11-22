import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/infrastructure/http/response';
import { generateOtpCode } from '@/modules/auth/otp';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string' || !/^\+91[6-9]\d{9}$/.test(phone)) {
      return apiError('VALIDATION_FAILED', 'Valid Indian E.164 phone number required (+91 followed by 10 digits)', 400, {
        field: 'phone',
      });
    }

    const requestId = randomUUID();
    const mockCode = generateOtpCode();

    return apiSuccess({
      requestId,
      phone,
      expiresInSeconds: 600,
      previewCode: mockCode,
    }, 200);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
