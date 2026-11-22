import {
  InvalidStageTransitionError,
  ProjectValidationError,
} from './errors';
import {
  PROJECT_STAGES_ORDER,
  type EventType,
  type FinancialStatus,
  type ProjectStage,
} from './types';

const VALID_EVENT_TYPES = new Set<EventType>([
  'Wedding',
  'Pre-Wedding',
  'Engagement',
  'Birthday',
  'Corporate',
  'Anniversary',
  'Other',
]);

export function validateEventType(val: string): EventType {
  if (!VALID_EVENT_TYPES.has(val as EventType)) {
    throw new ProjectValidationError(
      `Invalid eventType: "${val}". Must be one of: ${Array.from(VALID_EVENT_TYPES).join(', ')}`,
      { eventType: val },
    );
  }
  return val as EventType;
}

function toNonNegativeBigint(value: number | bigint, label: string): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new ProjectValidationError(`${label} cannot be negative, got ${value}`, { [label]: value.toString() });
    }
    return value;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new ProjectValidationError(
      `${label} must be a non-negative integer number of paise, got ${value}`,
      { [label]: value },
    );
  }
  return BigInt(value);
}

/**
 * Derives financial status from contract value and verified payments (PRD FR-E-04, §4).
 * Balance rule wins: a zero remaining balance is Financially Closed (including 0 contract / 0 paid).
 * - Financially Closed: balance (contract - paid) is 0
 * - Financially Open: paid is 0 and balance is non-zero
 * - Partially Settled: paid is non-zero and balance is non-zero
 */
export function deriveFinancialStatus({
  contractPaise,
  verifiedPaidPaise,
}: {
  contractPaise: number | bigint;
  verifiedPaidPaise: number | bigint;
}): FinancialStatus {
  const contract = toNonNegativeBigint(contractPaise, 'contractPaise');
  const paid = toNonNegativeBigint(verifiedPaidPaise, 'verifiedPaidPaise');

  if (paid > contract) {
    throw new ProjectValidationError(
      `verifiedPaidPaise (${paid}) cannot exceed contractPaise (${contract})`,
      { contractPaise: contract.toString(), verifiedPaidPaise: paid.toString() },
    );
  }

  const balance = contract - paid;
  if (balance === 0n) {
    return 'Financially Closed';
  }
  if (paid === 0n) {
    return 'Financially Open';
  }
  return 'Partially Settled';
}

/**
 * Validates a stage transition attempt.
 * - Stage 7 ('Financial Closed') is derived automatically and cannot be set or left manually (HLD §11c, ADR-003).
 * - Forward moves must be exactly one stage ahead.
 * - Backward moves must be exactly one stage back and require a non-empty note.
 */
export function validateStageTransition(
  currentStage: ProjectStage,
  targetStage: ProjectStage,
  notes?: string | null,
): void {
  if (targetStage === 'Financial Closed') {
    throw new InvalidStageTransitionError(
      'Stage 7 (Financial Closed) is derived from financial status and cannot be set manually',
      { currentStage, targetStage },
    );
  }
  if (currentStage === 'Financial Closed') {
    throw new InvalidStageTransitionError(
      'Stage 7 (Financial Closed) is terminal and cannot be left manually',
      { currentStage, targetStage },
    );
  }
  if (targetStage === currentStage) {
    throw new InvalidStageTransitionError(
      `Project is already in stage "${currentStage}"`,
      { currentStage, targetStage },
    );
  }

  const fromIndex = PROJECT_STAGES_ORDER.indexOf(currentStage);
  const toIndex = PROJECT_STAGES_ORDER.indexOf(targetStage);

  if (toIndex === fromIndex + 1) {
    return;
  }

  if (toIndex === fromIndex - 1) {
    if (typeof notes !== 'string' || notes.trim() === '') {
      throw new InvalidStageTransitionError(
        `A non-empty note is required to move backwards from "${currentStage}" to "${targetStage}"`,
        { currentStage, targetStage },
      );
    }
    return;
  }

  throw new InvalidStageTransitionError(
    `Invalid stage transition from "${currentStage}" to "${targetStage}": only single-step moves are allowed`,
    { currentStage, targetStage },
  );
}


/**
 * Resolves the effective project stage based on deliverables and financial status.
 * When deliverables reach 'Print & Delivered' AND financial status is 'Financially Closed',
 * the project automatically advances to 'Financial Closed' (HLD §11c, ADR-003).
 */
export function resolveEffectiveStage(
  currentStage: ProjectStage,
  financialStatus: FinancialStatus,
): ProjectStage {
  if (currentStage === 'Print & Delivered' && financialStatus === 'Financially Closed') {
    return 'Financial Closed';
  }
  return currentStage;
}
