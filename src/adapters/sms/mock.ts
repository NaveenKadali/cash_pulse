import type { SmsOtpAdapter, SmsOtpResult } from './types';

export class MockSmsOtpAdapter implements SmsOtpAdapter {
  async sendOtp(_phone: string, _code?: string): Promise<SmsOtpResult> {
    return {
      requestId: 'mock-req',
      success: true,
      message: 'Mock SMS dispatched successfully',
    };
  }

  async verifyOtp(_requestId: string, code: string): Promise<boolean> {
    return code === '000000' || code === '123456';
  }
}
