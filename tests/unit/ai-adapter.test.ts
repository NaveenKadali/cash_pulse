import { describe, expect, it } from 'vitest';
import { createAiAdapter, MockAiAdapter, GeminiAiAdapter } from '../../src/adapters/ai/index.js';

describe('AI Adapter (K8 & NU-5)', () => {
  it('creates MockAiAdapter when apiKey is explicitly empty', () => {
    const adapter = createAiAdapter({ apiKey: '' });
    expect(adapter).toBeInstanceOf(MockAiAdapter);
  });

  it('creates GeminiAiAdapter when apiKey is provided', () => {
    const adapter = createAiAdapter({ apiKey: 'test-api-key' });
    expect(adapter).toBeInstanceOf(GeminiAiAdapter);
  });

  it('drafts conversational nudge with strict monetary accuracy via mock', async () => {
    const adapter = new MockAiAdapter(false);
    const result = await adapter.draftNudge({
      tone: 'friendly',
      clientName: 'Priya Sharma',
      projectName: 'Sharma Wedding',
      invoiceAmountPaise: 5000000n,
      invoiceReference: 'INV-101',
      daysOverdue: 0,
      clientPageUrl: 'https://cashpulse.in/p/token123',
    });

    expect(result.source).toBe('mock');
    expect(result.messageText).toContain('Priya Sharma');
    expect(result.messageText).toContain('https://cashpulse.in/p/token123');
  });

  it('falls back to deterministic template when AI simulation fails', async () => {
    const adapter = new MockAiAdapter(true);
    const result = await adapter.draftNudge({
      tone: 'firm',
      clientName: 'Rohan Gupta',
      projectName: 'Gupta Pre-Wedding',
      invoiceAmountPaise: 3000000n,
      invoiceReference: 'INV-2026-99',
      daysOverdue: 7,
      upiLink: 'upi://pay?pa=test@upi',
    });

    expect(result.source).toBe('template_fallback');
    expect(result.messageText).toContain('Rohan Gupta');
    expect(result.messageText).toContain('30,000');
  });

  describe('GeminiAiAdapter resilience', () => {
    it('gracefully falls back when API key is empty', async () => {
      const adapter = new GeminiAiAdapter({ apiKey: '' });
      const result = await adapter.draftNudge({
        tone: 'formal',
        clientName: 'Ananya Verma',
        projectName: 'Verma Wedding',
        invoiceAmountPaise: 4500000n,
        invoiceReference: 'INV-VERMA',
        daysOverdue: 10,
        upiLink: 'upi://pay?pa=studio@upi',
      });

      expect(result.source).toBe('template_fallback');
      expect(result.fallbackReason).toBe('GEMINI_API_KEY is not configured');
      expect(result.messageText).toContain('Ananya Verma');
      expect(result.messageText).toContain('45,000');
    });

    it('gracefully falls back when remote Gemini API fails or times out', async () => {
      const adapter = new GeminiAiAdapter({
        apiKey: 'dummy-key',
        model: 'non-existent-model',
        timeoutMs: 100,
      });

      const result = await adapter.draftNudge({
        tone: 'firm',
        clientName: 'Vikram Malhotra',
        projectName: 'Malhotra Reception',
        invoiceAmountPaise: 7500000n,
        invoiceReference: 'INV-MAL-01',
        daysOverdue: 14,
        upiLink: 'upi://pay?pa=studio@upi',
      });

      expect(result.source).toBe('template_fallback');
      expect(result.messageText).toContain('Vikram Malhotra');
      expect(result.messageText).toContain('75,000');
    });

    it('summarize returns fallback string safely when offline', async () => {
      const adapter = new GeminiAiAdapter({ apiKey: '', timeoutMs: 100 });
      const summary = await adapter.summarize('₹24,000 available. Shortfall in 14 days.');
      expect(summary).toBe('₹24,000 available. Shortfall in 14 days.');
    });
  });
});
