import type { AiAdapter } from './types';
import { MockAiAdapter } from './mock';
import { GeminiAiAdapter, type GeminiAdapterConfig } from './gemini';

export type {
  AiAdapter,
  AiNudgeDraftRequest,
  AiNudgeDraftResult,
  NudgeTone,
} from './types';
export { MockAiAdapter } from './mock';
export { GeminiAiAdapter, type GeminiAdapterConfig } from './gemini';

export function createAiAdapter(config?: GeminiAdapterConfig): AiAdapter {
  const apiKey = config?.apiKey !== undefined ? config.apiKey : process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GeminiAiAdapter({ ...config, apiKey });
  }
  return new MockAiAdapter();
}
