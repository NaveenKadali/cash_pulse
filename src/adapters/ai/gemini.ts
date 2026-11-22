import type { AiAdapter, AiNudgeDraftRequest, AiNudgeDraftResult } from './types';
import { renderFallbackNudge } from './mock';

export interface GeminiAdapterConfig {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class GeminiAiAdapter implements AiAdapter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: GeminiAdapterConfig = {}) {
    this.apiKey = config.apiKey !== undefined ? config.apiKey : (process.env.GEMINI_API_KEY || '');
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.timeoutMs = config.timeoutMs || 10000;
  }

  async draftNudge(request: AiNudgeDraftRequest): Promise<AiNudgeDraftResult> {
    const fallbackMessage = renderFallbackNudge(request);

    if (!this.apiKey) {
      return {
        message: fallbackMessage,
        messageText: fallbackMessage,
        tone: request.tone,
        source: 'template_fallback',
        provider: 'template_fallback',
        usedFallback: true,
        fallbackReason: 'GEMINI_API_KEY is not configured',
      };
    }

    const systemPrompt = `You are a professional assistant for a boutique photography studio owner.
Rewrite the following payment nudge message in a ${request.tone} tone.
Crucial constraints:
- Maintain exact monetary amounts, reference IDs, and payment links from the reference message.
- Do not invent any new fees or change any due dates.
- Keep the message warm, professional, concise, and ready to send over WhatsApp or SMS.
- Return ONLY the final message text, nothing else.`;

    const userPrompt = `Client: ${request.clientName}
Project: ${request.projectName}
Tone: ${request.tone}
Reference Message:
${fallbackMessage}`;

    const candidateModels = [this.model, 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
    const triedModels = new Set<string>();

    for (const modelToTry of candidateModels) {
      if (triedModels.has(modelToTry)) continue;
      triedModels.add(modelToTry);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            return {
              message: generatedText,
              messageText: generatedText,
              tone: request.tone,
              source: 'gemini',
              provider: 'gemini',
              usedFallback: false,
            };
          }
        }
      } catch {
        // Fall through to next model or template
      }
    }

    return {
      message: fallbackMessage,
      messageText: fallbackMessage,
      tone: request.tone,
      source: 'template_fallback',
      provider: 'template_fallback',
      usedFallback: true,
      fallbackReason: 'Upstream Gemini service temporarily unavailable',
    };
  }

  async summarize(input: string): Promise<string> {
    if (!this.apiKey || !input.trim()) {
      return input.slice(0, 150);
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `Summarize the following studio cash telemetry in 1-2 concise sentences for morning brief:\n\n${input}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        return input.slice(0, 150);
      }

      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || input.slice(0, 150);
    } catch {
      return input.slice(0, 150);
    }
  }
}
