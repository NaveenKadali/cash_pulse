import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Fast2SmsOtpAdapter,
  TwoFactorSmsAdapter,
  createSmsOtpAdapter,
  MockSmsOtpAdapter,
} from '../../src/adapters/sms/index.js';

describe('Fast2SMS Adapter Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TWOFACTOR_API_KEY;
    delete process.env.FAST2SMS_API_KEY;
    delete process.env.SMS_PROVIDER;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('normalizePhoneNumber', () => {
    it('normalizes 10-digit Indian numbers starting with 6-9', () => {
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('9876543210')).toBe('9876543210');
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('7000000000')).toBe('7000000000');
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('8123456789')).toBe('8123456789');
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('6987654321')).toBe('6987654321');
    });

    it('strips +91 country prefix', () => {
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('+919876543210')).toBe('9876543210');
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('+91 98765 43210')).toBe('9876543210');
    });

    it('strips 91 prefix without plus', () => {
      expect(Fast2SmsOtpAdapter.normalizePhoneNumber('919876543210')).toBe('9876543210');
    });

    it('rejects invalid numbers, non-Indian numbers, or malformed formats', () => {
      expect(() => Fast2SmsOtpAdapter.normalizePhoneNumber('')).toThrow();
      expect(() => Fast2SmsOtpAdapter.normalizePhoneNumber('12345')).toThrow();
      expect(() => Fast2SmsOtpAdapter.normalizePhoneNumber('5987654321')).toThrow(); // Starts with 5
      expect(() => Fast2SmsOtpAdapter.normalizePhoneNumber('+14155552671')).toThrow(); // US number
      expect(() => Fast2SmsOtpAdapter.normalizePhoneNumber('abc1234567')).toThrow();
    });
  });

  describe('Fast2SmsOtpAdapter.sendOtp', () => {
    it('dispatches HTTP POST to Fast2SMS bulkV2 with route otp and variables_values', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          return: true,
          request_id: 'fast2sms-req-12345',
          message: ['SMS sent successfully.'],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new Fast2SmsOtpAdapter({ apiKey: 'test-fast2sms-key-xyz' });
      const result = await adapter.sendOtp('+919876543210', '482913');

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('fast2sms-req-12345');
      expect(result.message).toBe('SMS sent successfully.');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://www.fast2sms.com/dev/bulkV2');
      expect(options.method).toBe('POST');
      expect(options.headers.authorization).toBe('test-fast2sms-key-xyz');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.route).toBe('otp');
      expect(body.numbers).toBe('9876543210');
      expect(body.variables_values).toBe('482913');
    });

    it('throws descriptive error when Fast2SMS returns return: false', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          return: false,
          status_code: 411,
          message: 'Invalid mobile number or DND active',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new Fast2SmsOtpAdapter({ apiKey: 'test-key' });
      await expect(adapter.sendOtp('9876543210', '123456')).rejects.toThrow(
        /Fast2SMS delivery failed: Invalid mobile number/,
      );
    });

    it('throws descriptive error on HTTP 401 Unauthorized', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          return: false,
          status_code: 401,
          message: 'Invalid authorization key',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new Fast2SmsOtpAdapter({ apiKey: 'invalid-key' });
      await expect(adapter.sendOtp('9876543210', '123456')).rejects.toThrow(
        /Fast2SMS delivery failed: Invalid authorization key/,
      );
    });

    it('verifies 6-digit OTP code shape', async () => {
      const adapter = new Fast2SmsOtpAdapter({ apiKey: 'test-key' });
      expect(await adapter.verifyOtp('req-1', '123456')).toBe(true);
      expect(await adapter.verifyOtp('req-1', '12345')).toBe(false);
      expect(await adapter.verifyOtp('req-1', 'abcdef')).toBe(false);
    });
  });

  describe('createSmsOtpAdapter factory', () => {
    it('returns TwoFactorSmsAdapter when TWOFACTOR_API_KEY is present', () => {
      process.env.TWOFACTOR_API_KEY = 'real-twofactor-key';
      const adapter = createSmsOtpAdapter();
      expect(adapter).toBeInstanceOf(TwoFactorSmsAdapter);
    });

    it('returns Fast2SmsOtpAdapter when FAST2SMS_API_KEY is present', () => {
      process.env.FAST2SMS_API_KEY = 'real-fast2sms-key';
      const adapter = createSmsOtpAdapter();
      expect(adapter).toBeInstanceOf(Fast2SmsOtpAdapter);
    });

    it('returns MockSmsOtpAdapter in development/test when API keys are missing', () => {
      const adapter = createSmsOtpAdapter('test');
      expect(adapter).toBeInstanceOf(MockSmsOtpAdapter);
    });

    it('throws in production when API keys are missing', () => {
      expect(() => createSmsOtpAdapter({ nodeEnv: 'production' })).toThrow(
        /No SMS provider configured for NODE_ENV="production"/,
      );
    });
  });
});
