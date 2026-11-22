import { describe, expect, it } from 'vitest';
import {
  formatRupees,
  renderFirmTemplate,
  renderFormalTemplate,
  renderFriendlyTemplate,
  renderTemplate,
  TemplateValidationError,
} from '../../src/modules/nudges/templates.js';
import type {
  FirmTemplateParams,
  FormalTemplateParams,
  FriendlyTemplateParams,
} from '../../src/modules/nudges/templates.js';

const friendlyParams: FriendlyTemplateParams = {
  clientName: 'Asha',
  projectName: 'Wedding 2026',
  clientPageUrl: 'https://cashpulse.example/p/abc123',
};

const formalParams: FormalTemplateParams = {
  clientName: 'Asha',
  projectName: 'Wedding 2026',
  remainingAmountPaise: 2_500_050n,
  upiLink: 'upi://pay?pa=studio@upi&am=25000.50',
};

const firmParams: FirmTemplateParams = {
  clientName: 'Asha',
  projectName: 'Wedding 2026',
  invoiceRef: 'Invoice INV-042 (Milestone 2)',
  amountPaise: 1_234_567_89n,
  daysOverdue: 12,
  upiLink: 'upi://pay?pa=studio@upi&am=12345.67',
};

/** Returns the thrown error so tests can assert on its type and code. */
function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected function to throw');
}

describe('formatRupees', () => {
  it('formats zero paise as a rupee amount with two decimals', () => {
    expect(formatRupees(0n)).toBe('₹0.00');
  });

  it('pads single-digit paise to two digits', () => {
    expect(formatRupees(5n)).toBe('₹0.05');
  });

  it('groups thousands using Indian digit grouping', () => {
    expect(formatRupees(1_234_567_89n)).toBe('₹12,34,567.89');
  });

  it('does not add grouping separators below one thousand', () => {
    expect(formatRupees(99_999n)).toBe('₹999.99');
  });

  it('rejects negative paise', () => {
    expect(() => formatRupees(-1n)).toThrow(TemplateValidationError);
  });
});

describe('renderFriendlyTemplate', () => {
  it('includes the client name and project name', () => {
    const text = renderFriendlyTemplate(friendlyParams);
    expect(text).toContain('Asha');
    expect(text).toContain('Wedding 2026');
  });

  it('includes the client page link', () => {
    expect(renderFriendlyTemplate(friendlyParams)).toContain(
      'https://cashpulse.example/p/abc123',
    );
  });

  it('asks the client to shortlist photos and thanks them', () => {
    const text = renderFriendlyTemplate(friendlyParams);
    expect(text).toContain('thank you');
    expect(text).toContain('shortlist');
  });

  it('gives the same output for the same input', () => {
    expect(renderFriendlyTemplate(friendlyParams)).toBe(
      renderFriendlyTemplate({ ...friendlyParams }),
    );
  });

  it('rejects an empty client name', () => {
    const error = captureError(() =>
      renderFriendlyTemplate({ ...friendlyParams, clientName: '' }),
    );
    expect(error).toBeInstanceOf(TemplateValidationError);
    expect((error as TemplateValidationError).code).toBe('TEMPLATE_VALIDATION_ERROR');
  });

  it('rejects a whitespace-only project name', () => {
    expect(() =>
      renderFriendlyTemplate({ ...friendlyParams, projectName: '   ' }),
    ).toThrow(TemplateValidationError);
  });

  it('rejects an empty client page URL', () => {
    expect(() =>
      renderFriendlyTemplate({ ...friendlyParams, clientPageUrl: '' }),
    ).toThrow(TemplateValidationError);
  });
});

describe('renderFormalTemplate', () => {
  it('states that the album layout is final', () => {
    expect(renderFormalTemplate(formalParams)).toContain('layout');
    expect(renderFormalTemplate(formalParams)).toContain('is now final');
  });

  it('names the remaining milestone amount in rupees', () => {
    expect(renderFormalTemplate(formalParams)).toContain('₹25,000.50');
  });

  it('includes the UPI link', () => {
    expect(renderFormalTemplate(formalParams)).toContain(
      'upi://pay?pa=studio@upi&am=25000.50',
    );
  });

  it('gives the same output for the same input', () => {
    expect(renderFormalTemplate(formalParams)).toBe(
      renderFormalTemplate({ ...formalParams }),
    );
  });

  it('accepts a zero remaining amount', () => {
    expect(renderFormalTemplate({ ...formalParams, remainingAmountPaise: 0n })).toContain(
      '₹0.00',
    );
  });

  it('rejects a negative remaining amount', () => {
    expect(() =>
      renderFormalTemplate({ ...formalParams, remainingAmountPaise: -1n }),
    ).toThrow(TemplateValidationError);
  });

  it('rejects an empty UPI link', () => {
    expect(() => renderFormalTemplate({ ...formalParams, upiLink: '' })).toThrow(
      TemplateValidationError,
    );
  });

  it('rejects an empty project name', () => {
    expect(() => renderFormalTemplate({ ...formalParams, projectName: '' })).toThrow(
      TemplateValidationError,
    );
  });
});

describe('renderFirmTemplate', () => {
  it('names the invoice or milestone reference', () => {
    expect(renderFirmTemplate(firmParams)).toContain('Invoice INV-042 (Milestone 2)');
  });

  it('names the amount in rupees', () => {
    expect(renderFirmTemplate(firmParams)).toContain('₹12,34,567.89');
  });

  it('states the number of days overdue', () => {
    expect(renderFirmTemplate(firmParams)).toContain('overdue by 12 days');
  });

  it('uses the singular "day" for one day overdue', () => {
    expect(renderFirmTemplate({ ...firmParams, daysOverdue: 1 })).toContain(
      'overdue by 1 day.',
    );
  });

  it('states that dispatch and downloads remain on hold until settled', () => {
    const text = renderFirmTemplate(firmParams);
    expect(text).toContain('Dispatch and downloads');
    expect(text).toContain('remain on hold until the balance is settled');
  });

  it('includes the UPI link', () => {
    expect(renderFirmTemplate(firmParams)).toContain(
      'upi://pay?pa=studio@upi&am=12345.67',
    );
  });

  it('gives the same output for the same input', () => {
    expect(renderFirmTemplate(firmParams)).toBe(renderFirmTemplate({ ...firmParams }));
  });

  it('accepts zero days overdue', () => {
    expect(renderFirmTemplate({ ...firmParams, daysOverdue: 0 })).toContain(
      'overdue by 0 days',
    );
  });

  it('rejects negative days overdue', () => {
    expect(() => renderFirmTemplate({ ...firmParams, daysOverdue: -3 })).toThrow(
      TemplateValidationError,
    );
  });

  it('rejects non-integer days overdue', () => {
    expect(() => renderFirmTemplate({ ...firmParams, daysOverdue: 2.5 })).toThrow(
      TemplateValidationError,
    );
  });

  it('rejects a negative amount', () => {
    expect(() => renderFirmTemplate({ ...firmParams, amountPaise: -100n })).toThrow(
      TemplateValidationError,
    );
  });

  it('rejects an empty invoice reference', () => {
    expect(() => renderFirmTemplate({ ...firmParams, invoiceRef: ' ' })).toThrow(
      TemplateValidationError,
    );
  });
});

describe('renderTemplate', () => {
  it('renders the friendly template for tone "friendly"', () => {
    expect(renderTemplate('friendly', friendlyParams)).toBe(
      renderFriendlyTemplate(friendlyParams),
    );
  });

  it('renders the formal template for tone "formal"', () => {
    expect(renderTemplate('formal', formalParams)).toBe(renderFormalTemplate(formalParams));
  });

  it('renders the firm template for tone "firm"', () => {
    expect(renderTemplate('firm', firmParams)).toBe(renderFirmTemplate(firmParams));
  });

  it('throws a TemplateValidationError for an unknown tone', () => {
    const error = captureError(() =>
      (renderTemplate as (tone: string, params: unknown) => string)('casual', friendlyParams),
    );
    expect(error).toBeInstanceOf(TemplateValidationError);
  });
});
