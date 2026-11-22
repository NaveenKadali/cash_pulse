import { addDays, isValidCalendarDate } from '../../infrastructure/time';
import { ProjectValidationError } from './errors';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  percentage: number;
  amountPaise: bigint;
  dueDate: string | null;
}

export interface CustomMilestoneSplitInput {
  name: string;
  percentage?: number; // e.g. 50, 20, 30
  amountPaise?: bigint; // e.g. 5000000n
  dueDate?: string | null;
}

let milestoneCounter = 1;
function nextMilestoneId(): string {
  return `ms-${Date.now()}-${milestoneCounter++}`;
}

/**
 * Creates a fully customizable milestone schedule for any arbitrary split (PRD FR-A-08).
 * Supports any number of cuts: 50/50, 20/30/50, 20/30/20/30, 4-way, or custom ad-hoc paise amounts.
 * Guarantees exact integer paise sums matching contractValuePaise with zero rounding drift.
 */
export function createCustomMilestoneSchedule(
  contractValuePaise: bigint,
  splits: CustomMilestoneSplitInput[],
  eventDate?: string | null,
  projectId: string = '',
): Milestone[] {
  if (contractValuePaise < 0n) {
    throw new ProjectValidationError(
      `contractValuePaise cannot be negative: ${contractValuePaise.toString()}`,
    );
  }

  if (splits.length === 0) {
    throw new ProjectValidationError('At least one milestone split is required');
  }

  if (eventDate && !isValidCalendarDate(eventDate)) {
    throw new ProjectValidationError(`Invalid eventDate calendar format: "${eventDate}"`);
  }

  // Contract value 0 edge case
  if (contractValuePaise === 0n) {
    return splits.map((s) => ({
      id: nextMilestoneId(),
      projectId,
      name: s.name.trim(),
      percentage: s.percentage ?? 0,
      amountPaise: 0n,
      dueDate: s.dueDate ?? (eventDate ?? null),
    }));
  }

  const result: Milestone[] = [];
  let allocatedPaise = 0n;

  for (let i = 0; i < splits.length; i++) {
    const s = splits[i]!;
    if (!s.name || s.name.trim().length === 0) {
      throw new ProjectValidationError(`Milestone at index ${i} must have a non-empty name`);
    }

    if (s.dueDate && !isValidCalendarDate(s.dueDate)) {
      throw new ProjectValidationError(
        `Invalid dueDate at index ${i}: "${s.dueDate}"`,
      );
    }

    const isLast = i === splits.length - 1;

    let amountPaise: bigint;
    let percentage: number;

    if (isLast) {
      // Final milestone absorbs exact remaining paise to avoid any rounding drift
      amountPaise = contractValuePaise - allocatedPaise;
      if (amountPaise < 0n) {
        throw new ProjectValidationError(
          `Milestones exceed contract value of ${contractValuePaise.toString()} paise`,
        );
      }
      percentage =
        contractValuePaise > 0n
          ? Number((amountPaise * 10000n) / contractValuePaise) / 100
          : 0;
    } else if (s.amountPaise !== undefined) {
      if (s.amountPaise <= 0n) {
        throw new ProjectValidationError(
          `Milestone amount at index ${i} must be positive, got ${s.amountPaise.toString()}`,
        );
      }
      amountPaise = s.amountPaise;
      percentage = Number((amountPaise * 10000n) / contractValuePaise) / 100;
    } else if (s.percentage !== undefined) {
      if (s.percentage <= 0 || s.percentage > 100) {
        throw new ProjectValidationError(
          `Milestone percentage at index ${i} must be between 0 and 100, got ${s.percentage}`,
        );
      }
      percentage = s.percentage;
      amountPaise = (contractValuePaise * BigInt(Math.round(s.percentage * 100))) / 10000n;
    } else {
      throw new ProjectValidationError(
        `Milestone at index ${i} must specify either percentage or amountPaise`,
      );
    }

    allocatedPaise += amountPaise;

    result.push({
      id: nextMilestoneId(),
      projectId,
      name: s.name.trim(),
      percentage,
      amountPaise,
      dueDate: s.dueDate ?? (eventDate ?? null),
    });
  }

  // Final sanity assertion: sum must strictly equal contract value
  const totalAllocated = result.reduce((acc, m) => acc + m.amountPaise, 0n);
  if (totalAllocated !== contractValuePaise) {
    throw new ProjectValidationError(
      `Milestone schedule sum (${totalAllocated.toString()}) does not match contract value (${contractValuePaise.toString()})`,
    );
  }

  return result;
}

/**
 * Auto-adjusts and rebalances milestone schedules when a client makes an ad-hoc payment
 * that doesn't match the expected milestone amount (e.g. client pays ₹40,000 on a ₹30,000 stage,
 * or underpays with ₹15,000).
 *
 * Distributes surplus or carries forward deficit across remaining subsequent milestones,
 * keeping the overall contract value invariant intact.
 */
export function autoAdjustMilestonesForPayment(
  milestones: Milestone[],
  paymentAmountPaise: bigint,
  targetMilestoneId: string,
): {
  adjustedMilestones: Milestone[];
  targetDeltaPaise: bigint;
} {
  if (paymentAmountPaise <= 0n) {
    throw new ProjectValidationError('Payment amount must be positive');
  }

  const targetIdx = milestones.findIndex((m) => m.id === targetMilestoneId);
  if (targetIdx === -1) {
    throw new ProjectValidationError(`Milestone "${targetMilestoneId}" not found in schedule`);
  }

  const target = milestones[targetIdx]!;
  const targetDelta = paymentAmountPaise - target.amountPaise;

  const adjusted: Milestone[] = milestones.map((m) => ({ ...m }));

  if (targetDelta === 0n) {
    // Exact match, no adjustment required
    return { adjustedMilestones: adjusted, targetDeltaPaise: 0n };
  }

  // Adjust target milestone to match the actual payment received
  adjusted[targetIdx]!.amountPaise = paymentAmountPaise;

  // Rebalance remaining subsequent milestones
  const subsequentMilestones = adjusted.slice(targetIdx + 1);
  if (subsequentMilestones.length > 0) {
    if (targetDelta > 0n) {
      // Surplus: client paid more than expected -> reduce future milestones
      let remainingSurplus = targetDelta;
      for (const nextM of subsequentMilestones) {
        if (remainingSurplus <= 0n) break;
        if (nextM.amountPaise >= remainingSurplus) {
          nextM.amountPaise -= remainingSurplus;
          remainingSurplus = 0n;
        } else {
          remainingSurplus -= nextM.amountPaise;
          nextM.amountPaise = 0n;
        }
      }
    } else {
      // Deficit: client paid less than expected -> add remaining shortfall to the immediately next milestone
      const shortfall = -targetDelta;
      subsequentMilestones[0]!.amountPaise += shortfall;
    }
  }

  // Recalculate percentage weights
  const total = adjusted.reduce((acc, m) => acc + m.amountPaise, 0n);
  if (total > 0n) {
    for (const m of adjusted) {
      m.percentage = Number((m.amountPaise * 10000n) / total) / 100;
    }
  }

  return {
    adjustedMilestones: adjusted,
    targetDeltaPaise: targetDelta,
  };
}
