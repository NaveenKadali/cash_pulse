// Vendors module errors. Codes are stable identifiers for API consumers.

export class VendorsError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'VendorsError';
    this.code = code;
    this.details = details;
  }
}

export class VendorNotFoundError extends VendorsError {
  constructor(vendorId: string, details?: Record<string, unknown>) {
    super('VENDOR_NOT_FOUND', `Vendor "${vendorId}" was not found`, { vendorId, ...details });
    this.name = 'VendorNotFoundError';
  }
}

export class InvalidVendorCategoryError extends VendorsError {
  constructor(category: unknown, details?: Record<string, unknown>) {
    super('INVALID_VENDOR_CATEGORY', `Vendor category "${String(category)}" is not allowed`, {
      category,
      ...details,
    });
    this.name = 'InvalidVendorCategoryError';
  }
}

export class DuplicateVendorError extends VendorsError {
  constructor(name: string, details?: Record<string, unknown>) {
    super('DUPLICATE_VENDOR', `An active vendor named "${name}" already exists in this studio`, {
      name,
      ...details,
    });
    this.name = 'DuplicateVendorError';
  }
}

export class VendorValidationError extends VendorsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VENDOR_VALIDATION', message, details);
    this.name = 'VendorValidationError';
  }
}

export class BillNotFoundError extends VendorsError {
  constructor(billId: string, details?: Record<string, unknown>) {
    super('BILL_NOT_FOUND', `Vendor bill "${billId}" was not found`, { billId, ...details });
    this.name = 'BillNotFoundError';
  }
}

export class BillOverpaymentError extends VendorsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BILL_OVERPAYMENT', message, details);
    this.name = 'BillOverpaymentError';
  }
}

export class BillValidationError extends VendorsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BILL_VALIDATION_ERROR', message, details);
    this.name = 'BillValidationError';
  }
}

export class RecurringExpenseNotFoundError extends VendorsError {
  constructor(expenseId: string, details?: Record<string, unknown>) {
    super('RECURRING_EXPENSE_NOT_FOUND', `Recurring expense "${expenseId}" was not found`, {
      expenseId,
      ...details,
    });
    this.name = 'RecurringExpenseNotFoundError';
  }
}

export class RecurringExpenseValidationError extends VendorsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RECURRING_EXPENSE_VALIDATION_ERROR', message, details);
    this.name = 'RecurringExpenseValidationError';
  }
}
