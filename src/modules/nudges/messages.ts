import {
  NudgesError,
  TemplateValidationError,
  renderFirmTemplate,
  renderFormalTemplate,
  renderFriendlyTemplate,
  renderTemplate,
  type TemplateTone,
} from './templates';

export interface ComposeNudgeInput {
  tone: TemplateTone;
  clientName: string;
  clientPhone: string;
  projectName: string;
  amountPaise: bigint;
  daysOverdue?: number;
  invoiceRef?: string;
  upiLink?: string;
  clientPageUrl?: string;
}

export interface ComposedNudge {
  tone: TemplateTone;
  messageText: string;
  clientPhone: string;
  whatsappUrl: string;
  whatsappIntentUrl: string;
  smsUrl: string;
}

/**
 * Normalizes an Indian phone number or E.164 phone number into clean digits for wa.me / sms.
 * e.g. "+91 98765-43210" -> "919876543210", "9876543210" -> "919876543210".
 */
export function normalizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string' || phone.trim().length === 0) {
    throw new TemplateValidationError('Phone number must be a non-empty string', { phone });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // International E.164 with at least 8 digits
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  throw new TemplateValidationError(
    `Invalid phone number format: "${phone}". Expected 10-digit Indian mobile or valid E.164 number.`,
    { phone },
  );
}

/**
 * Composes a ready-to-dispatch follow-up nudge message across deterministic tones (PRD FR-F-01, FR-F-02).
 * Formats message and generates WhatsApp (Web + Mobile App Intent) and SMS click-to-chat links.
 */
export function composeFollowUpMessage(input: ComposeNudgeInput): ComposedNudge {
  if (!input.tone || !['friendly', 'formal', 'firm'].includes(input.tone)) {
    throw new TemplateValidationError(`Invalid tone: "${String(input.tone)}"`, { tone: input.tone });
  }

  const cleanPhone = normalizePhoneNumber(input.clientPhone);

  let messageText = '';

  switch (input.tone) {
    case 'friendly': {
      if (!input.clientPageUrl || input.clientPageUrl.trim().length === 0) {
        throw new TemplateValidationError('clientPageUrl is required for friendly tone', {
          tone: input.tone,
        });
      }
      messageText = renderFriendlyTemplate({
        clientName: input.clientName,
        projectName: input.projectName,
        clientPageUrl: input.clientPageUrl,
      });
      break;
    }

    case 'formal': {
      if (!input.upiLink || input.upiLink.trim().length === 0) {
        throw new TemplateValidationError('upiLink is required for formal tone', {
          tone: input.tone,
        });
      }
      messageText = renderFormalTemplate({
        clientName: input.clientName,
        projectName: input.projectName,
        remainingAmountPaise: input.amountPaise,
        upiLink: input.upiLink,
      });
      break;
    }

    case 'firm': {
      if (!input.upiLink || input.upiLink.trim().length === 0) {
        throw new TemplateValidationError('upiLink is required for firm tone', {
          tone: input.tone,
        });
      }
      if (!input.invoiceRef || input.invoiceRef.trim().length === 0) {
        throw new TemplateValidationError('invoiceRef is required for firm tone', {
          tone: input.tone,
        });
      }
      const daysOverdue = input.daysOverdue ?? 0;
      messageText = renderFirmTemplate({
        clientName: input.clientName,
        projectName: input.projectName,
        invoiceRef: input.invoiceRef,
        amountPaise: input.amountPaise,
        daysOverdue,
        upiLink: input.upiLink,
      });
      break;
    }
  }

  const encoded = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
  const whatsappIntentUrl = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;
  const smsUrl = `sms:${cleanPhone}?body=${encoded}`;

  return {
    tone: input.tone,
    messageText,
    clientPhone: cleanPhone,
    whatsappUrl,
    whatsappIntentUrl,
    smsUrl,
  };
}
