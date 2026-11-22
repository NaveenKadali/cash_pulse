import type { TemplateTone } from '../../modules/nudges/templates';

export type NudgeTone = TemplateTone;

export interface AiNudgeDraftRequest {
  clientName: string;
  projectName: string;
  tone: NudgeTone;
  clientPageUrl?: string;
  upiLink?: string;
  amountPaise?: bigint;
  invoiceAmountPaise?: bigint;
  invoiceRef?: string;
  invoiceReference?: string;
  daysOverdue?: number;
}

export interface AiNudgeDraftResult {
  messageText: string;
  message: string;
  tone: NudgeTone;
  source: 'gemini' | 'template_fallback' | 'mock';
  provider: 'gemini' | 'template_fallback' | 'mock';
  usedFallback: boolean;
  fallbackReason?: string;
}

export interface AiAdapter {
  draftNudge(request: AiNudgeDraftRequest): Promise<AiNudgeDraftResult>;
  summarize(input: string): Promise<string>;
}
