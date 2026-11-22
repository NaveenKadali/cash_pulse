export class InvoicingError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'InvoicingError';
    this.code = code;
    this.details = details;
  }
}

export class MilestoneSumMismatchError extends InvoicingError {
  constructor(
    sumPaise: bigint,
    contractValuePaise: bigint,
    details?: Record<string, unknown>,
  ) {
    super(
      'MILESTONE_SUM_MISMATCH',
      `Milestone amounts sum to ${sumPaise} paise, but contract value is ${contractValuePaise} paise`,
      { sumPaise: sumPaise.toString(), contractValuePaise: contractValuePaise.toString(), ...details },
    );
    this.name = 'MilestoneSumMismatchError';
  }
}

export class OverpaymentError extends InvoicingError {
  constructor(
    paymentAmountPaise: bigint,
    remainingBalancePaise: bigint,
    details?: Record<string, unknown>,
  ) {
    super(
      'OVERPAYMENT_REJECTED',
      `Payment of ${paymentAmountPaise} paise exceeds remaining milestone balance of ${remainingBalancePaise} paise`,
      { paymentAmountPaise: paymentAmountPaise.toString(), remainingBalancePaise: remainingBalancePaise.toString(), ...details },
    );
    this.name = 'OverpaymentError';
  }
}

export class MissingTransactionReferenceError extends InvoicingError {
  constructor(paymentMode: string) {
    super(
      'MISSING_TRANSACTION_REFERENCE',
      `Transaction reference (UTR) is mandatory for payment mode "${paymentMode}"`,
      { paymentMode },
    );
    this.name = 'MissingTransactionReferenceError';
  }
}

export class VoidPaymentError extends InvoicingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VOID_PAYMENT_ERROR', message, details);
    this.name = 'VoidPaymentError';
  }
}

export class InvoicingValidationError extends InvoicingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'InvoicingValidationError';
  }
}
