import type { Paise } from '../../infrastructure/money';

export type PlanTier = 'Free' | 'Starter';

export interface OpeningBalanceInput {
  asOfDate: string; // ISO date YYYY-MM-DD
  amountPaise: bigint;
}

export interface InflowItem {
  id: string; // milestone id or identifier
  projectId: string;
  projectName?: string;
  milestoneTitle?: string;
  expectedDate: string | null; // null if unscheduled / overdue without date
  amountPaise: bigint; // remaining balance (milestone amount - verified non-voided payments)
  confidence: 'OwnerConfirmed' | 'SystemEstimated';
  isOverdue?: boolean;
}

export interface OutflowItem {
  id: string; // bill id or recurring expense id
  category?: string;
  dueDate: string; // ISO date YYYY-MM-DD
  amountPaise: bigint; // remaining payable (bill amount - payments)
  kind: 'VendorBill' | 'RecurringExpense';
  confidence: 'OwnerConfirmed' | 'SystemEstimated';
}

export interface DelayOverride {
  milestoneId: string;
  assumedCollectionDate: string; // ISO date YYYY-MM-DD
}

export interface ForecastInput {
  studioId: string;
  plan: PlanTier;
  horizonDays: number; // 30 | 60 | 90 (Free tier capped at 30)
  openingBalance: OpeningBalanceInput;
  inflows: InflowItem[];
  outflows: OutflowItem[];
  delayOverrides?: DelayOverride[];
  safetyThresholdPaise?: bigint; // defaults to 0n
  currentDate?: string; // Asia/Kolkata date
}

export interface DayMovementInflow {
  id: string;
  projectId: string;
  amountPaise: bigint;
  confidence: 'OwnerConfirmed' | 'SystemEstimated';
}

export interface DayMovementOutflow {
  id: string;
  amountPaise: bigint;
  kind: 'VendorBill' | 'RecurringExpense';
  confidence: 'OwnerConfirmed' | 'SystemEstimated';
}

export interface DayProjection {
  date: string;
  dayIndex: number; // 0 for day0 (asOfDate), 1..horizonDays
  balancePaise: bigint;
  inflowPaise: bigint;
  outflowPaise: bigint;
  inflowItems: DayMovementInflow[];
  outflowItems: DayMovementOutflow[];
}

export interface CandidateCover {
  kind: 'Milestone' | 'OverdueNoDate';
  refId: string;
  coverPaise: bigint;
  expectedDate?: string | null;
  flag?: 'AfterVendorDue' | 'AtRisk';
}

export interface ShortfallReport {
  shortfallDate: string;
  dayIndex: number;
  shortfallPaise: bigint;
  candidates: CandidateCover[];
  coveredPaise: bigint; // "could help cover"
  remainingGapPaise: bigint;
}

export interface RunwayResult {
  horizonDays: number;
  asOfDate: string;
  startDate: string;
  endDate: string;
  days: DayProjection[];
  lowestBalancePaise: bigint;
  lowestBalanceDate: string;
  shortfalls: ShortfallReport[];
  runwayDaysCount: number; // days until first shortfall below safety threshold, or horizonDays if solvent
}

export interface ScenarioComparison {
  baseline: RunwayResult;
  whatIf: RunwayResult;
  lowestBalanceDeltaPaise: bigint;
  firstShortfallDayDifference: number | null;
}
