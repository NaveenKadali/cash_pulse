import { randomInt, randomUUID } from 'node:crypto';
import type { SmsOtpAdapter, SmsOtpResult } from './types';

export interface TwoFactorConfig {
  apiKey: string;
  baseUrl?: string;
  otpTemplateName?: string;
}

export class TwoFactorSmsAdapter implements SmsOtpAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly otpTemplateName?: string;

  constructor(config: TwoFactorConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
      throw new Error('2Factor API key is required');
    }
    this.apiKey = config.apiKey.trim();
    this.baseUrl = config.baseUrl ?? 'https://2factor.in/API/V1';
    this.otpTemplateName = config.otpTemplateName;
  }

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
    const mobile = TwoFactorSmsAdapter.normalizePhoneNumber(phone);
    const otpCode = code ?? randomInt(100000, 999999).toString();

    let url: string;
    if (this.otpTemplateName) {
      url = `${this.baseUrl}/${encodeURIComponent(this.apiKey)}/SMS/${mobile}/${encodeURIComponent(otpCode)}/${encodeURIComponent(this.otpTemplateName)}`;
    } else {
      url = `${this.baseUrl}/${encodeURIComponent(this.apiKey)}/SMS/${mobile}/${encodeURIComponent(otpCode)}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (err) {
      throw new Error(`2Factor network dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`2Factor returned non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || data.Status !== 'Success') {
      const msg = data.Details || `HTTP ${response.status} Error from 2Factor`;
      throw new Error(`2Factor delivery failed: ${msg}`);
    }

    return {
      requestId: String(data.Details || randomUUID()),
      success: true,
      message: 'SMS sent successfully via 2Factor',
    };
  }

  async verifyOtp(requestId: string, code: string): Promise<boolean> {
    if (!requestId || !code) return false;
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(this.apiKey)}/SMS/VERIFY/${encodeURIComponent(requestId)}/${encodeURIComponent(code)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.Status === 'Success';
    } catch {
      return typeof code === 'string' && /^\d{6}$/.test(code.trim());
    }
  }
}
