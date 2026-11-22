import type { PaymentGatewayAdapter } from './types';
import { SandboxPaymentGatewayAdapter } from './sandbox';

export type {
  PaymentGatewayAdapter,
  PaymentOrderParams,
  PaymentOrderResult,
  PaymentVerificationResult,
  UpiLinkParams,
} from './types';
export { SandboxPaymentGatewayAdapter } from './sandbox';

export function createPaymentGatewayAdapter(nodeEnv: string): PaymentGatewayAdapter {
  return new SandboxPaymentGatewayAdapter(nodeEnv);
}
