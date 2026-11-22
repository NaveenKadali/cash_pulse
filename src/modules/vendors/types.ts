// Vendor directory data contracts (PRD FR-B-01, PRD §9 Vendor entity; migration 0001 vendor table, 0004 category CHECK).

export const VENDOR_CATEGORIES = [
  'second_shooter',
  'drone_pilot',
  'editor',
  'album_designer',
  'print_lab',
  'software_tool',
  'other',
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export interface Vendor {
  id: string;
  studioId: string;
  name: string;
  phone: string | null;
  paymentHandle: string | null;
  category: VendorCategory;
  defaultRatePaise: bigint | null;
  notes: string | null;
  archived: boolean;
}

export interface CreateVendorInput {
  studioId: string;
  name: string;
  phone: string;
  paymentHandle?: string | null;
  category: VendorCategory;
  defaultRatePaise?: bigint | null;
  notes?: string | null;
}

export interface UpdateVendorInput {
  name?: string;
  phone?: string;
  paymentHandle?: string | null;
  category?: VendorCategory;
  defaultRatePaise?: bigint | null;
  notes?: string | null;
}

export interface VendorRepository {
  findById(studioId: string, id: string): Promise<Vendor | null>;
  listByStudio(studioId: string): Promise<Vendor[]>;
  insert(vendor: Vendor): Promise<void>;
  update(vendor: Vendor): Promise<void>;
}

// -------------------------------------------------------------
// Vendor Bills & Payments (PRD FR-B-02, FR-B-05, FR-B-07, LLD §3.8, §3.9)
// -------------------------------------------------------------

export type BillStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type VendorPaymentMode = 'UPI' | 'Bank transfer' | 'Cash' | 'Other';

export interface VendorBill {
  id: string;
  studioId: string;
  vendorId: string;
  linkedProjectId: string | null;
  amountPaise: bigint;
  dueDate: string; // YYYY-MM-DD
  notes?: string | null;
  createdAt: string;
}

export interface VendorPayment {
  id: string;
  studioId: string;
  billId: string;
  amountPaise: bigint;
  paidOn: string; // YYYY-MM-DD
  paymentMode: VendorPaymentMode;
  transactionUtrRef?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateBillInput {
  studioId: string;
  vendorId: string;
  amountPaise: bigint;
  dueDate: string;
  linkedProjectId?: string | null;
  notes?: string | null;
}

export interface RecordVendorPaymentInput {
  studioId: string;
  billId: string;
  amountPaise: bigint;
  paidOn: string;
  paymentMode?: VendorPaymentMode;
  transactionUtrRef?: string | null;
  notes?: string | null;
}

export type AgingBucket = '0' | '1–15' | '16–30' | '31–60' | '61+';

export interface BillAgingItem {
  billId: string;
  vendorId: string;
  vendorName: string;
  linkedProjectId: string | null;
  totalAmountPaise: bigint;
  paidAmountPaise: bigint;
  remainingPayablePaise: bigint;
  dueDate: string;
  daysOverdue: number;
  isOverdue: boolean;
  status: BillStatus;
  bucket: AgingBucket;
}

export interface PayablesAgingReport {
  asOfDate: string;
  totalPayablePaise: bigint;
  totalOverduePaise: bigint;
  items: BillAgingItem[];
}

export interface VendorBillRepository {
  findById(studioId: string, id: string): Promise<VendorBill | null>;
  listByStudio(studioId: string): Promise<VendorBill[]>;
  listByProject(studioId: string, projectId: string): Promise<VendorBill[]>;
  insert(bill: VendorBill): Promise<void>;
  update(bill: VendorBill): Promise<void>;
}

export interface VendorPaymentRepository {
  findById(studioId: string, id: string): Promise<VendorPayment | null>;
  listByBill(studioId: string, billId: string): Promise<VendorPayment[]>;
  listByStudio(studioId: string): Promise<VendorPayment[]>;
  insert(payment: VendorPayment): Promise<void>;
}

// -------------------------------------------------------------
// Recurring Expenses (PRD FR-B-04, LLD §3.10)
// -------------------------------------------------------------

export interface RecurringExpense {
  id: string;
  studioId: string;
  name: string;
  amountPaise: bigint;
  dayOfMonth: number; // 1..28
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD, nullable, must be >= startDate
  category?: string | null;
  createdAt: string;
}

export interface CreateRecurringExpenseInput {
  studioId: string;
  name: string;
  amountPaise: bigint;
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
  category?: string | null;
}

export interface UpdateRecurringExpenseInput {
  name?: string;
  amountPaise?: bigint;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string | null;
  category?: string | null;
}

export interface RecurringInstance {
  expenseId: string;
  name: string;
  date: string; // YYYY-MM-DD
  amountPaise: bigint;
}

export interface RecurringExpenseRepository {
  findById(studioId: string, id: string): Promise<RecurringExpense | null>;
  listByStudio(studioId: string): Promise<RecurringExpense[]>;
  insert(expense: RecurringExpense): Promise<void>;
  update(expense: RecurringExpense): Promise<void>;
  delete(studioId: string, id: string): Promise<void>;
}
