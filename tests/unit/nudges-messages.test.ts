import { describe, expect, it } from 'vitest';
import {
  TemplateValidationError,
  composeFollowUpMessage,
  normalizePhoneNumber,
} from '../../src/modules/nudges/index.js';

describe('Follow-Up Message Composer (PRD FR-F-01, FR-F-02, NU-2)', () => {
  // -----------------------------------------------------------
  // Phone Number Normalization
  // -----------------------------------------------------------
  describe('normalizePhoneNumber', () => {
    it('normalizes 10-digit Indian numbers with country prefix 91', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('919876543210');
    });

    it('normalizes formatted numbers with dashes, spaces, and + prefix', () => {
      expect(normalizePhoneNumber('+91 98765-43210')).toBe('919876543210');
      expect(normalizePhoneNumber('+919876543210')).toBe('919876543210');
    });

    it('retains international E.164 numbers', () => {
      expect(normalizePhoneNumber('+44 20 7946 0991')).toBe('442079460991');
    });

    // Adversarial Negative Tests
    it('rejects empty phone number', () => {
      expect(() => normalizePhoneNumber('')).toThrow(TemplateValidationError);
      expect(() => normalizePhoneNumber('   ')).toThrow(TemplateValidationError);
    });

    it('rejects phone number with too few digits', () => {
      expect(() => normalizePhoneNumber('12345')).toThrow(TemplateValidationError);
    });

    it('rejects completely non-numeric strings', () => {
      expect(() => normalizePhoneNumber('call-me-maybe')).toThrow(TemplateValidationError);
    });
  });

  // -----------------------------------------------------------
  // Message Composition across Tones
  // -----------------------------------------------------------
  describe('composeFollowUpMessage', () => {
    it('composes friendly sneak-peek message with wa.me and sms URLs', () => {
      const result = composeFollowUpMessage({
        tone: 'friendly',
        clientName: 'Priya & Rahul',
        clientPhone: '9876543210',
        projectName: 'Royal Palace Wedding',
        amountPaise: 0n,
        clientPageUrl: 'https://cashpulse.app/p/demo-token-128',
      });

      expect(result.tone).toBe('friendly');
      expect(result.clientPhone).toBe('919876543210');
      expect(result.messageText).toContain('Priya & Rahul');
      expect(result.messageText).toContain('Royal Palace Wedding');
      expect(result.messageText).toContain('https://cashpulse.app/p/demo-token-128');
      expect(result.whatsappUrl).toContain('https://wa.me/919876543210?text=');
      expect(result.whatsappUrl).toContain(encodeURIComponent('https://cashpulse.app/p/demo-token-128'));
      expect(result.smsUrl).toContain('sms:919876543210?body=');
    });

    it('composes formal print-gate message with UPI payment details', () => {
      const result = composeFollowUpMessage({
        tone: 'formal',
        clientName: 'Sunita Sharma',
        clientPhone: '+91 98111 22334',
        projectName: 'Sunita Reception',
        amountPaise: 3500000n, // ₹35,000
        upiLink: 'upi://pay?pa=studio@icici&pn=Studio&am=35000.00&cu=INR',
      });

      expect(result.tone).toBe('formal');
      expect(result.clientPhone).toBe('919811122334');
      expect(result.messageText).toContain('Sunita Sharma');
      expect(result.messageText).toContain('₹35,000.00');
      expect(result.messageText).toContain('upi://pay?pa=studio@icici');
      expect(result.whatsappUrl).toContain('https://wa.me/919811122334?text=');
    });

    it('composes firm overdue notice with days overdue and hold notice', () => {
      const result = composeFollowUpMessage({
        tone: 'firm',
        clientName: 'Amit Verma',
        clientPhone: '9988776655',
        projectName: 'Amit Sangeet',
        invoiceRef: 'INV-2026-042',
        amountPaise: 2500000n, // ₹25,000
        daysOverdue: 14,
        upiLink: 'upi://pay?pa=studio@icici&pn=Studio&am=25000.00&cu=INR',
      });

      expect(result.tone).toBe('firm');
      expect(result.messageText).toContain('Amit Verma');
      expect(result.messageText).toContain('INV-2026-042');
      expect(result.messageText).toContain('is overdue by 14 days');
      expect(result.messageText).toContain('remain on hold until the balance is settled');
      expect(result.messageText).toContain('₹25,000.00');
      expect(result.whatsappUrl).toContain('https://wa.me/919988776655?text=');
    });

    // -----------------------------------------------------------
    // Adversarial Negative Tests (2:1 ratio)
    // -----------------------------------------------------------
    it('rejects invalid tone', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'aggressive' as any,
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 1000n,
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects friendly tone when clientPageUrl is missing', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'friendly',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 0n,
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects friendly tone when clientPageUrl is whitespace only', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'friendly',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 0n,
          clientPageUrl: '   ',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects formal tone when upiLink is missing', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'formal',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 500000n,
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects formal tone when upiLink is whitespace only', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'formal',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 500000n,
          upiLink: '   ',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects firm tone when invoiceRef is missing', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'firm',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 500000n,
          upiLink: 'upi://pay?...',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects firm tone when upiLink is missing', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'firm',
          clientName: 'Test',
          clientPhone: '9876543210',
          projectName: 'Project',
          invoiceRef: 'INV-1',
          amountPaise: 500000n,
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects empty clientName across all tones', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'friendly',
          clientName: '',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: 0n,
          clientPageUrl: 'https://link.com',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects empty projectName across all tones', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'formal',
          clientName: 'Client',
          clientPhone: '9876543210',
          projectName: '   ',
          amountPaise: 500000n,
          upiLink: 'upi://pay?...',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects negative amount in formal tone', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'formal',
          clientName: 'Client',
          clientPhone: '9876543210',
          projectName: 'Project',
          amountPaise: -100n,
          upiLink: 'upi://pay?...',
        }),
      ).toThrow(TemplateValidationError);
    });

    it('rejects negative daysOverdue in firm tone', () => {
      expect(() =>
        composeFollowUpMessage({
          tone: 'firm',
          clientName: 'Client',
          clientPhone: '9876543210',
          projectName: 'Project',
          invoiceRef: 'INV-1',
          amountPaise: 100000n,
          daysOverdue: -3,
          upiLink: 'upi://pay?...',
        }),
      ).toThrow(TemplateValidationError);
    });
  });
});
