// Vendors: supplier directory (PRD FR-B-01), vendor bills (FR-B-02), payables aging (FR-B-05),
// vendor payments (FR-B-07), and recurring expenses (FR-B-04).

export {
  VendorDirectory,
  InMemoryVendorRepository,
} from './directory';

export {
  calculateRemainingPayable,
  calculateBillStatus,
  calculateAgingBucket,
  generatePayablesAgingReport,
  InMemoryVendorBillRepository,
  InMemoryVendorPaymentRepository,
  VendorBillService,
} from './bills';
export type { BillWithPayments } from './bills';

export {
  validateDayOfMonth,
  expandRecurringInstances,
  InMemoryRecurringExpenseRepository,
  RecurringExpenseService,
} from './recurring';

export {
  DuplicateVendorError,
  InvalidVendorCategoryError,
  VendorNotFoundError,
  VendorValidationError,
  VendorsError,
  BillNotFoundError,
  BillOverpaymentError,
  BillValidationError,
  RecurringExpenseNotFoundError,
  RecurringExpenseValidationError,
} from './errors';

export { VENDOR_CATEGORIES } from './types';

export type {
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
  VendorCategory,
  VendorRepository,
  BillStatus,
  VendorPaymentMode,
  VendorBill,
  VendorPayment,
  CreateBillInput,
  RecordVendorPaymentInput,
  AgingBucket,
  BillAgingItem,
  PayablesAgingReport,
  VendorBillRepository,
  VendorPaymentRepository,
  RecurringExpense,
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
  RecurringInstance,
  RecurringExpenseRepository,
} from './types';
