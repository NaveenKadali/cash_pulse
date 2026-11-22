import type { ForecastInput, InflowItem, OutflowItem } from '../../modules/forecast/types.js';

/**
 * "Aarav Pixels" canonical demo fixture (UI-10).
 *
 * Pure, deterministic data only: no database access, no randomness, no clock.
 * All monetary amounts are integer bigint paise (1 INR = 100 paise).
 * All calendar dates are YYYY-MM-DD (Asia/Kolkata calendar dates).
 */

export interface AaravClient {
  id: string;
  name: string;
}

export interface AaravProject {
  id: string;
  clientId: string;
  name: string;
}

export interface AaravMilestone {
  id: string;
  projectId: string;
  title: string;
  amountPaise: bigint;
  expectedDate: string | null;
}

export interface AaravHistoricPayment {
  id: string;
  milestoneId: string;
  projectId: string;
  amountPaise: bigint;
  paidOn: string;
}

export interface AaravVendorBill {
  id: string;
  category: string;
  vendor: string;
  amountPaise: bigint;
  dueDate: string;
}

export interface AaravRecurringExpense {
  id: string;
  category: string;
  amountPaise: bigint;
  dueDayOfMonth: number;
}

export interface AaravPixelsDataset {
  asOfDate: string;
  studio: { name: string; upiHandle: string };
  openingBalancePaise: bigint;
  clients: AaravClient[];
  projects: AaravProject[];
  milestones: AaravMilestone[];
  historicPayments: AaravHistoricPayment[];
  vendorBills: AaravVendorBill[];
  recurringExpenses: AaravRecurringExpense[];
  forecastInput: ForecastInput;
}

/**
 * Adds `n` calendar days to a YYYY-MM-DD date using pure UTC calendar arithmetic.
 * Never uses local-time Date methods.
 */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const yy = String(t.getUTCFullYear()).padStart(4, '0');
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function buildAaravPixelsDataset(asOfDate: string): AaravPixelsDataset {
  const openingBalancePaise = 2400000n; // ₹24,000

  const clients: AaravClient[] = [
    { id: 'client-verma', name: 'Verma Family' },
    { id: 'client-kapoor', name: 'Kapoor Family' },
    { id: 'client-mehta', name: 'Mehta & Co' },
    { id: 'client-sharma', name: 'Sharma Studios' },
    { id: 'client-singhania', name: 'Singhania Textiles' },
  ];

  const projects: AaravProject[] = [
    { id: 'proj-verma', clientId: 'client-verma', name: 'Verma Wedding' },
    { id: 'proj-kapoor', clientId: 'client-kapoor', name: 'Kapoor Engagement' },
    { id: 'proj-mehta', clientId: 'client-mehta', name: 'Mehta Corporate Brand Shoot' },
    { id: 'proj-sharma', clientId: 'client-sharma', name: 'Sharma Product Portfolio' },
    { id: 'proj-singhania', clientId: 'client-singhania', name: 'Singhania Lookbook' },
  ];

  // 15 milestones: 3 per project. Only the Verma final milestone falls in days 0-14.
  const milestones: AaravMilestone[] = [
    // Verma Wedding
    { id: 'ms-verma-1', projectId: 'proj-verma', title: 'Advance', amountPaise: 1500000n, expectedDate: null },
    { id: 'ms-verma-2', projectId: 'proj-verma', title: 'Final Delivery', amountPaise: 4500000n, expectedDate: addDays(asOfDate, 10) },
    { id: 'ms-verma-3', projectId: 'proj-verma', title: 'Album', amountPaise: 3000000n, expectedDate: addDays(asOfDate, 45) },
    // Kapoor Engagement (fully paid before asOfDate)
    { id: 'ms-kapoor-1', projectId: 'proj-kapoor', title: 'Advance', amountPaise: 2000000n, expectedDate: null },
    { id: 'ms-kapoor-2', projectId: 'proj-kapoor', title: 'Shoot Day', amountPaise: 1500000n, expectedDate: null },
    { id: 'ms-kapoor-3', projectId: 'proj-kapoor', title: 'Edited Selects', amountPaise: 2500000n, expectedDate: null },
    // Mehta Corporate Brand Shoot
    { id: 'ms-mehta-1', projectId: 'proj-mehta', title: 'Advance', amountPaise: 1000000n, expectedDate: null },
    { id: 'ms-mehta-2', projectId: 'proj-mehta', title: 'Shoot Day', amountPaise: 2500000n, expectedDate: addDays(asOfDate, 20) },
    { id: 'ms-mehta-3', projectId: 'proj-mehta', title: 'Final Delivery', amountPaise: 1800000n, expectedDate: addDays(asOfDate, 50) },
    // Sharma Product Portfolio
    { id: 'ms-sharma-1', projectId: 'proj-sharma', title: 'Advance', amountPaise: 2200000n, expectedDate: null },
    { id: 'ms-sharma-2', projectId: 'proj-sharma', title: 'Shoot Day', amountPaise: 3000000n, expectedDate: addDays(asOfDate, 30) },
    { id: 'ms-sharma-3', projectId: 'proj-sharma', title: 'Final Delivery', amountPaise: 2000000n, expectedDate: addDays(asOfDate, 60) },
    // Singhania Lookbook
    { id: 'ms-singhania-1', projectId: 'proj-singhania', title: 'Advance', amountPaise: 1200000n, expectedDate: null },
    { id: 'ms-singhania-2', projectId: 'proj-singhania', title: 'Shoot Day', amountPaise: 1800000n, expectedDate: null },
    { id: 'ms-singhania-3', projectId: 'proj-singhania', title: 'Final Delivery', amountPaise: 2600000n, expectedDate: addDays(asOfDate, 35) },
  ];

  // Payments for milestones that are fully settled before asOfDate.
  const historicPayments: AaravHistoricPayment[] = [
    { id: 'pay-verma-1', milestoneId: 'ms-verma-1', projectId: 'proj-verma', amountPaise: 1500000n, paidOn: addDays(asOfDate, -30) },
    { id: 'pay-kapoor-1', milestoneId: 'ms-kapoor-1', projectId: 'proj-kapoor', amountPaise: 2000000n, paidOn: addDays(asOfDate, -40) },
    { id: 'pay-kapoor-2', milestoneId: 'ms-kapoor-2', projectId: 'proj-kapoor', amountPaise: 1500000n, paidOn: addDays(asOfDate, -20) },
    { id: 'pay-kapoor-3', milestoneId: 'ms-kapoor-3', projectId: 'proj-kapoor', amountPaise: 2500000n, paidOn: addDays(asOfDate, -10) },
    { id: 'pay-mehta-1', milestoneId: 'ms-mehta-1', projectId: 'proj-mehta', amountPaise: 1000000n, paidOn: addDays(asOfDate, -45) },
    { id: 'pay-sharma-1', milestoneId: 'ms-sharma-1', projectId: 'proj-sharma', amountPaise: 2200000n, paidOn: addDays(asOfDate, -15) },
    { id: 'pay-singhania-1', milestoneId: 'ms-singhania-1', projectId: 'proj-singhania', amountPaise: 1200000n, paidOn: addDays(asOfDate, -25) },
    { id: 'pay-singhania-2', milestoneId: 'ms-singhania-2', projectId: 'proj-singhania', amountPaise: 1800000n, paidOn: addDays(asOfDate, -5) },
  ];

  // 8 vendor bills. Only Print-Lab falls in days 0-14; the other 7 are due on or after day 15.
  const vendorBills: AaravVendorBill[] = [
    { id: 'bill-print-lab', category: 'Print Lab', vendor: 'Print-Lab', amountPaise: 7000000n, dueDate: addDays(asOfDate, 14) },
    { id: 'bill-fabric-props', category: 'Props', vendor: 'Bazaar Fabrics', amountPaise: 1200000n, dueDate: addDays(asOfDate, 18) },
    { id: 'bill-venue', category: 'Venue', vendor: 'Studio Lofts', amountPaise: 2500000n, dueDate: addDays(asOfDate, 22) },
    { id: 'bill-freelance-editor', category: 'Freelance', vendor: 'Editor Collective', amountPaise: 1800000n, dueDate: addDays(asOfDate, 28) },
    { id: 'bill-courier', category: 'Logistics', vendor: 'Swift Courier', amountPaise: 300000n, dueDate: addDays(asOfDate, 33) },
    { id: 'bill-album-print', category: 'Print Lab', vendor: 'Print-Lab', amountPaise: 2200000n, dueDate: addDays(asOfDate, 40) },
    { id: 'bill-assistants', category: 'Freelance', vendor: 'Crew Assist', amountPaise: 900000n, dueDate: addDays(asOfDate, 45) },
    { id: 'bill-cloud', category: 'Software', vendor: 'CloudVault', amountPaise: 150000n, dueDate: addDays(asOfDate, 60) },
  ];

  // Recurring expenses are kept out of the 0-14 forecast input (see forecastInput below).
  const recurringExpenses: AaravRecurringExpense[] = [
    { id: 'rec-rent', category: 'Rent', amountPaise: 2500000n, dueDayOfMonth: 10 }, // ₹25,000
    { id: 'rec-adobe', category: 'Software', amountPaise: 400000n, dueDayOfMonth: 5 }, // ₹4,000
  ];

  // Only the movements checked by the runway test: Verma collection (day 10) and Print-Lab bill (day 14).
  const verma: InflowItem = {
    id: 'ms-verma-2',
    projectId: 'proj-verma',
    projectName: 'Verma Wedding',
    milestoneTitle: 'Final Delivery',
    expectedDate: addDays(asOfDate, 10),
    amountPaise: 4500000n,
    confidence: 'OwnerConfirmed',
    isOverdue: false,
  };

  const printLab: OutflowItem = {
    id: 'bill-print-lab',
    category: 'Print Lab',
    dueDate: addDays(asOfDate, 14),
    amountPaise: 7000000n,
    kind: 'VendorBill',
    confidence: 'OwnerConfirmed',
  };

  const forecastInput: ForecastInput = {
    studioId: 'studio-aarav-pixels',
    plan: 'Starter',
    horizonDays: 30,
    openingBalance: { asOfDate, amountPaise: openingBalancePaise },
    inflows: [verma],
    outflows: [printLab],
    currentDate: asOfDate,
  };

  return {
    asOfDate,
    studio: { name: 'Aarav Pixels', upiHandle: 'aaravpixels@icici' },
    openingBalancePaise,
    clients,
    projects,
    milestones,
    historicPayments,
    vendorBills,
    recurringExpenses,
    forecastInput,
  };
}
