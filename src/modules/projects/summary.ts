import { ProjectValidationError } from './errors';
import type {
  FinancialStatus,
  ProjectFinancialSummary,
  ProjectStage,
} from './types';

export interface ComputeSummaryInput {
  projectId: string;
  contractValuePaise: bigint;
  totalInvoicedPaise: bigint;
  verifiedCollectedPaise: bigint;
  unverifiedCollectedPaise?: bigint;
  actualVendorCostsPaise?: bigint;
  estimatedVendorCostsPaise?: bigint;
  stage: ProjectStage;
  financialStatus: FinancialStatus;
  holdPolicyEnabled?: boolean;
}

/**
 * Deterministically calculates expected contribution and retention percentage (PRD FR-C-01, §7 rule 5 & 6).
 * - Expected project contribution = contract value − (actual vendor costs; or estimated costs where actuals are not yet recorded)
 * - Retention % = expected project contribution ÷ contract value (null if contract value is 0)
 */
export function calculateProjectContribution(
  contractValuePaise: bigint,
  actualCostsPaise: bigint,
  estimatedCostsPaise: bigint = 0n,
): {
  effectiveCostsPaise: bigint;
  expectedContributionPaise: bigint;
  retentionPercentage: number | null;
} {
  if (contractValuePaise < 0n) {
    throw new ProjectValidationError(
      `contractValuePaise cannot be negative: ${contractValuePaise.toString()}`,
    );
  }
  if (actualCostsPaise < 0n || estimatedCostsPaise < 0n) {
    throw new ProjectValidationError('Vendor costs cannot be negative');
  }

  // Use actual vendor costs where recorded; fallback to estimated costs
  const effectiveCostsPaise =
    actualCostsPaise > 0n ? actualCostsPaise : estimatedCostsPaise;

  const expectedContributionPaise = contractValuePaise - effectiveCostsPaise;

  let retentionPercentage: number | null = null;
  if (contractValuePaise > 0n) {
    // Keep 2 decimal precision (e.g. 45.50%)
    const bps = (expectedContributionPaise * 10000n) / contractValuePaise;
    retentionPercentage = Number(bps) / 100;
  }

  return {
    effectiveCostsPaise,
    expectedContributionPaise,
    retentionPercentage,
  };
}

/**
 * Determines whether deliverables hold notice is active (PRD FR-E-03).
 * When hold policy is enabled, if project is at/past Digital Proofs / Album Layout and pending client balance > 0,
 * hold flag is active.
 */
export function isDeliverableHoldActive(
  stage: ProjectStage,
  pendingClientBalancePaise: bigint,
  holdPolicyEnabled: boolean = true,
): boolean {
  if (!holdPolicyEnabled) return false;
  if (pendingClientBalancePaise <= 0n) return false;

  const holdApplicableStages: readonly ProjectStage[] = [
    'Digital Proofs Ready',
    'Album Layout Approved',
    'Print & Delivered',
  ];

  return holdApplicableStages.includes(stage);
}

/**
 * Computes full financial summary for a project (PRD FR-C-01, PR-7).
 */
export function computeProjectFinancialSummary(
  input: ComputeSummaryInput,
): ProjectFinancialSummary {
  const unverifiedCollected = input.unverifiedCollectedPaise ?? 0n;
  const actualCosts = input.actualVendorCostsPaise ?? 0n;
  const estimatedCosts = input.estimatedVendorCostsPaise ?? 0n;

  const totalCollected = input.verifiedCollectedPaise + unverifiedCollected;
  const pendingClientBalance = input.contractValuePaise - totalCollected;

  const { effectiveCostsPaise, expectedContributionPaise, retentionPercentage } =
    calculateProjectContribution(input.contractValuePaise, actualCosts, estimatedCosts);

  const holdActive = isDeliverableHoldActive(
    input.stage,
    pendingClientBalance,
    input.holdPolicyEnabled ?? true,
  );

  return {
    projectId: input.projectId,
    contractValuePaise: input.contractValuePaise,
    totalInvoicedPaise: input.totalInvoicedPaise,
    verifiedCollectedPaise: input.verifiedCollectedPaise,
    unverifiedCollectedPaise: unverifiedCollected,
    pendingClientBalancePaise: pendingClientBalance < 0n ? 0n : pendingClientBalance,
    actualVendorCostsPaise: actualCosts,
    estimatedVendorCostsPaise: estimatedCosts,
    effectiveVendorCostsPaise: effectiveCostsPaise,
    expectedContributionPaise,
    retentionPercentage,
    stage: input.stage,
    financialStatus: input.financialStatus,
    isDeliverableHold: holdActive,
  };
}
