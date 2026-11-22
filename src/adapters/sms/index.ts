import type { SmsOtpAdapter, SmsOtpResult } from './types';
import { MockSmsOtpAdapter } from './mock';
import { Fast2SmsOtpAdapter, type Fast2SmsConfig } from './fast2sms';
import { TwoFactorSmsAdapter, type TwoFactorConfig } from './twofactor';

export type { SmsOtpAdapter, SmsOtpResult };
export {
  MockSmsOtpAdapter,
  Fast2SmsOtpAdapter,
  TwoFactorSmsAdapter,
  type Fast2SmsConfig,
  type TwoFactorConfig,
};

export interface SmsAdapterOptions {
  nodeEnv?: string;
  provider?: '2factor' | 'fast2sms' | 'mock';
  twoFactorApiKey?: string;
  fast2smsApiKey?: string;
  fast2smsRoute?: 'otp' | 'dlt' | 'q';
  senderId?: string;
  messageId?: string;
}

export function createSmsOtpAdapter(options?: SmsAdapterOptions | string): SmsOtpAdapter {
  const opts: SmsAdapterOptions =
    typeof options === 'string'
      ? { nodeEnv: options }
      : (options ?? {});

  const preferredProvider = opts.provider || process.env.SMS_PROVIDER;
  const twoFactorKey = (opts.twoFactorApiKey || process.env.TWOFACTOR_API_KEY)?.trim();
  const fast2smsKey = (opts.fast2smsApiKey || process.env.FAST2SMS_API_KEY)?.trim();

  // 1. Explicit 2Factor or default when 2Factor key is present
  if (preferredProvider === '2factor' && twoFactorKey) {
    return new TwoFactorSmsAdapter({ apiKey: twoFactorKey });
  }

  // 2. Explicit Fast2SMS
  if (preferredProvider === 'fast2sms' && fast2smsKey) {
    return new Fast2SmsOtpAdapter({
      apiKey: fast2smsKey,
      route: opts.fast2smsRoute || (process.env.FAST2SMS_ROUTE as any) || 'otp',
      senderId: opts.senderId || process.env.FAST2SMS_SENDER_ID,
      messageId: opts.messageId || process.env.FAST2SMS_MESSAGE_ID,
    });
  }

  // 3. Auto-detect: Prioritize 2Factor because it is verified live
  if (twoFactorKey) {
    return new TwoFactorSmsAdapter({ apiKey: twoFactorKey });
  }

  if (fast2smsKey) {
    return new Fast2SmsOtpAdapter({
      apiKey: fast2smsKey,
      route: opts.fast2smsRoute || (process.env.FAST2SMS_ROUTE as any) || 'otp',
      senderId: opts.senderId || process.env.FAST2SMS_SENDER_ID,
      messageId: opts.messageId || process.env.FAST2SMS_MESSAGE_ID,
    });
  }

  const nodeEnv = opts.nodeEnv || process.env.NODE_ENV || 'development';
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return new MockSmsOtpAdapter();
  }

  throw new Error(
    `No SMS provider configured for NODE_ENV="${nodeEnv}". Set TWOFACTOR_API_KEY or FAST2SMS_API_KEY in environment.`,
  );
}
