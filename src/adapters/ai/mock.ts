import type { AiAdapter, AiNudgeDraftRequest, AiNudgeDraftResult } from './types';
import { renderTemplate } from '../../modules/nudges/templates';

export function renderFallbackNudge(request: AiNudgeDraftRequest): string {
  const amount = request.invoiceAmountPaise || request.amountPaise || 0n;
  const ref = request.invoiceReference || request.invoiceRef || 'INV-001';

  if (request.tone === 'friendly') {
    return renderTemplate('friendly', {
      clientName: request.clientName,
      projectName: request.projectName,
      clientPageUrl: request.clientPageUrl || 'https://cashpulse.studio/p/demo',
    });
  }
  if (request.tone === 'formal') {
    return renderTemplate('formal', {
      clientName: request.clientName,
      projectName: request.projectName,
      remainingAmountPaise: amount,
      upiLink: request.upiLink || 'upi://pay',
    });
  }
  return renderTemplate('firm', {
    clientName: request.clientName,
    projectName: request.projectName,
    invoiceRef: ref,
    amountPaise: amount,
    daysOverdue: request.daysOverdue || 1,
    upiLink: request.upiLink || 'upi://pay',
  });
}

export class MockAiAdapter implements AiAdapter {
  constructor(private readonly shouldSimulateAiFailure: boolean = false) {}

  async draftNudge(request: AiNudgeDraftRequest): Promise<AiNudgeDraftResult> {
    const fallbackMessage = renderFallbackNudge(request);

    if (this.shouldSimulateAiFailure) {
      return {
        message: fallbackMessage,
        messageText: fallbackMessage,
        tone: request.tone,
        source: 'template_fallback',
        provider: 'template_fallback',
        usedFallback: true,
        fallbackReason: 'Simulated AI provider failure',
      };
    }

    const draft = `[AI Draft - ${request.tone}] ${fallbackMessage}`;
    return {
      message: draft,
      messageText: draft,
      tone: request.tone,
      source: 'mock',
      provider: 'mock',
      usedFallback: false,
    };
  }

  async summarize(input: string): Promise<string> {
    return input.slice(0, 150);
  }
}
