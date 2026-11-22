export interface SmsOtpResult {
  requestId: string;
  success: boolean;
  message?: string;
}

export interface SmsOtpAdapter {
  sendOtp(phone: string, code?: string): Promise<SmsOtpResult>;
  verifyOtp(requestId: string, code: string): Promise<boolean>;
}
