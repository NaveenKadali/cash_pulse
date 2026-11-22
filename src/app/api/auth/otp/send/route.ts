import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { generateOtpCode, hashOtpCode, normalizeLoginIdentifier } from '@/modules/auth/otp';
import { activeOtpStore, type ActiveOtpRecord } from '@/modules/auth/registry';
import { createSmsOtpAdapter } from '@/adapters/sms';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contact, method } = body;

    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      return NextResponse.json({ error: 'Contact number or email is required' }, { status: 400 });
    }

    let identifier: string;
    try {
      identifier = normalizeLoginIdentifier(contact);
    } catch (normErr) {
      return NextResponse.json(
        { error: normErr instanceof Error ? normErr.message : 'Invalid contact format' },
        { status: 400 },
      );
    }

    const isDemoContact =
      identifier === '+919876543210' ||
      identifier === '+910000000000' ||
      identifier.endsWith('9876543210') ||
      identifier.endsWith('0000000000') ||
      identifier === 'aarav@pixels.studio' ||
      identifier === 'aarav@aaravpixels.com' ||
      identifier.includes('demo');

    const rawOtp = isDemoContact ? '123456' : generateOtpCode();
    const digest = hashOtpCode(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const requestId = randomUUID();

    const otpRecord: ActiveOtpRecord = {
      requestId,
      identifier,
      codeHash: digest,
      codeForTesting: rawOtp,
      attempts: 0,
      expiresAt,
      createdAt: new Date(),
    };

    activeOtpStore.set(requestId, otpRecord);
    // Key also by normalized identifier for quick lookup
    activeOtpStore.set(identifier, otpRecord);

    const isPhone = identifier.startsWith('+');
    let smsMessage = 'Verification code generated';

    if (isPhone && !isDemoContact) {
      try {
        const smsAdapter = createSmsOtpAdapter();
        const smsResult = await smsAdapter.sendOtp(identifier, rawOtp);
        if (smsResult.message) {
          smsMessage = smsResult.message;
        }
      } catch (smsErr) {
        return NextResponse.json(
          {
            error: `Failed to dispatch SMS: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`,
          },
          { status: 502 },
        );
      }
    }

    const hasRealSms = Boolean(
      (process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim()) ||
      (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim()),
    );

    return NextResponse.json({
      success: true,
      requestId,
      message: isPhone
        ? (hasRealSms && !isDemoContact ? `SMS verification code dispatched to ${contact}` : `Verification code sent to ${contact}`)
        : `Verification code sent to ${contact}`,
      expiresAt: expiresAt.toISOString(),
      // In production with real SMS gateway, previewCode is omitted so real SMS is required; in mock/dev or demo contacts it is provided
      previewCode: (hasRealSms && !isDemoContact) ? undefined : rawOtp,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
