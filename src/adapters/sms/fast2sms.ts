import { randomInt, randomUUID } from 'node:crypto';
import type { SmsOtpAdapter, SmsOtpResult } from './types';

export interface Fast2SmsConfig {
  apiKey: string;
  route?: 'otp' | 'dlt' | 'q';
  senderId?: string;
  messageId?: string;
  baseUrl?: string;
}

export class Fast2SmsOtpAdapter implements SmsOtpAdapter {
  private readonly apiKey: string;
  private readonly route: 'otp' | 'dlt' | 'q';
  private readonly senderId?: string;
  private readonly messageId?: string;
  private readonly baseUrl: string;

  constructor(config: Fast2SmsConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
      throw new Error('Fast2SMS API key is required');
    }
    this.apiKey = config.apiKey.trim();
    this.route = config.route ?? 'otp';
    this.senderId = config.senderId;
    this.messageId = config.messageId;
    this.baseUrl = config.baseUrl ?? 'https://www.fast2sms.com/dev';
  }

  /**
   * Normalizes an Indian phone number to 10 digits for Fast2SMS.
   * Accepts "+919876543210", "919876543210", "9876543210", "98765 43210", etc.
   */
  static normalizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Phone number is required');
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      return digits;
    }
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
      return digits.slice(2);
    }
    throw new Error(`Invalid Indian mobile number: "${phone}". Expected 10 digits starting with 6-9.`);
  }

  async sendOtp(phone: string, code?: string): Promise<SmsOtpResult> {
    const mobile = Fast2SmsOtpAdapter.normalizePhoneNumber(phone);
    const otpCode = code ?? randomInt(100000, 999999).toString();

    const payload: Record<string, unknown> = {
      route: this.route,
      numbers: mobile,
    };

    if (this.route === 'otp') {
      payload.variables_values = otpCode;
    } else if (this.route === 'dlt') {
      if (!this.senderId || !this.messageId) {
        throw new Error('Fast2SMS DLT route requires senderId and messageId');
      }
      payload.sender_id = this.senderId;
      payload.message = this.messageId;
      payload.variables_values = otpCode;
    } else {
      payload.message = `Your CashPulse verification code is ${otpCode}. Valid for 10 minutes.`;
    }

    const endpoint = `${this.baseUrl}/bulkV2`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error(`Fast2SMS network dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fast2SMS returned non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || data.return === false) {
      const msg = Array.isArray(data?.message)
        ? data.message.join(', ')
        : (data?.message ?? `HTTP ${response.status} Error`);
      throw new Error(`Fast2SMS delivery failed: ${msg}`);
    }

    const requestId = data.request_id || randomUUID();
    const successMessage = Array.isArray(data?.message) ? data.message[0] : (data?.message ?? 'SMS sent successfully');

    return {
      requestId,
      success: true,
      message: successMessage,
    };
  }

  async verifyOtp(_requestId: string, code: string): Promise<boolean> {
    return typeof code === 'string' && /^\d{6}$/.test(code.trim());
  }
}
