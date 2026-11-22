// Deterministic payment-nudge templates (PRD FR-F-01, P0, no AI required).
//
// Tone mapping (PRD lines 191-194):
//   Friendly = Tone 1 - celebratory sneak-peek: thank-you, client page link, shortlist photos.
//   Formal   = Tone 2 - album approved / print release gate: layout final, remaining amount, UPI link.
//   Firm     = Tone 3 - firm due notice: invoice/milestone, amount, days overdue, dispatch and
//              downloads on hold until settled, UPI link.

export type TemplateTone = 'friendly' | 'firm' | 'formal';

export interface FriendlyTemplateParams {
  clientName: string;
  projectName: string;
  clientPageUrl: string;
}

export interface FormalTemplateParams {
  clientName: string;
  projectName: string;
  remainingAmountPaise: bigint;
  upiLink: string;
}

export interface FirmTemplateParams {
  clientName: string;
  projectName: string;
  invoiceRef: string;
  amountPaise: bigint;
  daysOverdue: number;
  upiLink: string;
}

export interface TemplateParamsByTone {
  friendly: FriendlyTemplateParams;
  formal: FormalTemplateParams;
  firm: FirmTemplateParams;
}

export class NudgesError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'NudgesError';
    this.code = code;
    this.details = details;
  }
}

export class TemplateValidationError extends NudgesError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('TEMPLATE_VALIDATION_ERROR', message, details);
    this.name = 'TemplateValidationError';
  }
}

function assertNonEmptyString(field: string, value: unknown): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TemplateValidationError(`${field} must be a non-empty string`, { field });
  }
}

function assertNonNegativePaise(field: string, value: unknown): void {
  if (typeof value !== 'bigint' || value < 0n) {
    throw new TemplateValidationError(`${field} must be a non-negative bigint paise amount`, {
      field,
      value: typeof value === 'bigint' ? value.toString() : String(value),
    });
  }
}

function assertNonNegativeInteger(field: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new TemplateValidationError(`${field} must be a non-negative integer`, {
      field,
      value: String(value),
    });
  }
}

/**
 * Formats a bigint paise amount as Indian rupees, e.g. 123456789n -> "₹12,34,567.89".
 * Pure and deterministic. Rejects negative or non-bigint input.
 */
export function formatRupees(paise: bigint): string {
  assertNonNegativePaise('paise', paise);
  const rupees = (paise / 100n).toString();
  const minor = (paise % 100n).toString().padStart(2, '0');
  const grouped =
    rupees.length <= 3
      ? rupees
      : `${rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${rupees.slice(-3)}`;
  return `₹${grouped}.${minor}`;
}

/** Tone 1 (Friendly): celebratory sneak-peek with client page link and shortlist request. */
export function renderFriendlyTemplate(params: FriendlyTemplateParams): string {
  assertNonEmptyString('clientName', params.clientName);
  assertNonEmptyString('projectName', params.projectName);
  assertNonEmptyString('clientPageUrl', params.clientPageUrl);

  return (
    `Hi ${params.clientName}, thank you for trusting us with ${params.projectName}! ` +
    `Here is your project page: ${params.clientPageUrl} ` +
    `Please take a look and shortlist the photos you love so we can move ahead.`
  );
}

/** Tone 2 (Formal): album approved, print release gate with remaining amount and UPI link. */
export function renderFormalTemplate(params: FormalTemplateParams): string {
  assertNonEmptyString('clientName', params.clientName);
  assertNonEmptyString('projectName', params.projectName);
  assertNonEmptyString('upiLink', params.upiLink);
  assertNonNegativePaise('remainingAmountPaise', params.remainingAmountPaise);

  return (
    `Dear ${params.clientName}, the album layout for ${params.projectName} is now final. ` +
    `To release the album for print, please settle the remaining milestone amount of ` +
    `${formatRupees(params.remainingAmountPaise)} via UPI: ${params.upiLink}`
  );
}

/** Tone 3 (Firm): overdue due notice; dispatch and downloads stay on hold until settled. */
export function renderFirmTemplate(params: FirmTemplateParams): string {
  assertNonEmptyString('clientName', params.clientName);
  assertNonEmptyString('projectName', params.projectName);
  assertNonEmptyString('invoiceRef', params.invoiceRef);
  assertNonEmptyString('upiLink', params.upiLink);
  assertNonNegativePaise('amountPaise', params.amountPaise);
  assertNonNegativeInteger('daysOverdue', params.daysOverdue);

  const dayWord = params.daysOverdue === 1 ? 'day' : 'days';
  return (
    `Dear ${params.clientName}, this is a notice that ${params.invoiceRef} for ` +
    `${params.projectName} amounting to ${formatRupees(params.amountPaise)} is overdue by ` +
    `${params.daysOverdue} ${dayWord}. Dispatch and downloads for ${params.projectName} ` +
    `remain on hold until the balance is settled. Please pay via UPI: ${params.upiLink}`
  );
}

/**
 * Renders the template for the given tone. Dispatches to the matching
 * renderer above; the params type is checked against the tone at compile time.
 */
export function renderTemplate(tone: 'friendly', params: FriendlyTemplateParams): string;
export function renderTemplate(tone: 'formal', params: FormalTemplateParams): string;
export function renderTemplate(tone: 'firm', params: FirmTemplateParams): string;
export function renderTemplate(tone: TemplateTone, params: TemplateParamsByTone[TemplateTone]): string {
  switch (tone) {
    case 'friendly':
      return renderFriendlyTemplate(params as FriendlyTemplateParams);
    case 'formal':
      return renderFormalTemplate(params as FormalTemplateParams);
    case 'firm':
      return renderFirmTemplate(params as FirmTemplateParams);
    default:
      throw new TemplateValidationError(`Unknown template tone: ${String(tone)}`, { tone: String(tone) });
  }
}
