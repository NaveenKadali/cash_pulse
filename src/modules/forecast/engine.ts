import {
  addDays,
  isValidCalendarDate,
} from '../../infrastructure/time';
import { PlanLimitError, ValidationError } from './errors';
import type {
  CandidateCover,
  DayMovementInflow,
  DayMovementOutflow,
  DayProjection,
  DelayOverride,
  ForecastInput,
  RunwayResult,
  ScenarioComparison,
  ShortfallReport,
} from './types';

export function computeRunway(input: ForecastInput): RunwayResult {
  if (
    !Number.isInteger(input.horizonDays) ||
    input.horizonDays <= 0 ||
    isNaN(input.horizonDays)
  ) {
    throw new ValidationError(
      `Forecast horizonDays must be a positive integer, got ${input.horizonDays}`,
      { horizonDays: input.horizonDays },
    );
  }

  if (input.plan === 'Free' && input.horizonDays > 30) {
    throw new PlanLimitError(
      `Forecast horizon is capped at 30 days on Free plan (requested ${input.horizonDays})`,
      { horizonDays: input.horizonDays, plan: input.plan },
    );
  }

  if (input.horizonDays > 90) {
    throw new ValidationError(
      `Forecast horizonDays cannot exceed 90 days (requested ${input.horizonDays})`,
      { horizonDays: input.horizonDays },
    );
  }

  const asOfDate = input.openingBalance.asOfDate;
  if (!isValidCalendarDate(asOfDate)) {
    throw new ValidationError(
      `Invalid opening balance asOfDate: "${asOfDate}"`,
      { asOfDate },
    );
  }

  const overrideMap = new Map<string, string>();
  for (const override of input.delayOverrides ?? []) {
    if (!isValidCalendarDate(override.assumedCollectionDate)) {
      throw new ValidationError(
        `Invalid assumedCollectionDate in delay override: "${override.assumedCollectionDate}"`,
        { override },
      );
    }
    overrideMap.set(override.milestoneId, override.assumedCollectionDate);
  }

  const startDate = addDays(asOfDate, 1);
  const endDate = addDays(asOfDate, input.horizonDays);

  const inflowsByDate = new Map<string, DayMovementInflow[]>();
  const resolvedInflowCandidates: Array<{
    id: string;
    expectedDate: string | null;
    amountPaise: bigint;
  }> = [];

  for (const inflow of input.inflows) {
    if (inflow.amountPaise <= 0n) continue;

    const effectiveDate = overrideMap.get(inflow.id) ?? inflow.expectedDate;

    if (effectiveDate !== null) {
      if (!isValidCalendarDate(effectiveDate)) {
        throw new ValidationError(
          `Invalid expectedDate for inflow ${inflow.id}: "${effectiveDate}"`,
          { inflowId: inflow.id, date: effectiveDate },
        );
      }

      resolvedInflowCandidates.push({
        id: inflow.id,
        expectedDate: effectiveDate,
        amountPaise: inflow.amountPaise,
      });

      // FR-D-08 (c): Items dated on or before asOfDate are excluded from forecast window (already in opening balance)
      if (effectiveDate <= asOfDate) {
        continue;
      }

      // Inflow occurs beyond the requested forecast horizon
      if (effectiveDate > endDate) {
        continue;
      }

      const existing = inflowsByDate.get(effectiveDate) ?? [];
      existing.push({
        id: inflow.id,
        projectId: inflow.projectId,
        amountPaise: inflow.amountPaise,
        confidence: inflow.confidence,
      });
      inflowsByDate.set(effectiveDate, existing);
    } else {
      // Unscheduled or overdue without date
      resolvedInflowCandidates.push({
        id: inflow.id,
        expectedDate: null,
        amountPaise: inflow.amountPaise,
      });
    }
  }

  const outflowsByDate = new Map<string, DayMovementOutflow[]>();
  for (const outflow of input.outflows) {
    if (outflow.amountPaise <= 0n) continue;

    if (!isValidCalendarDate(outflow.dueDate)) {
      throw new ValidationError(
        `Invalid dueDate for outflow ${outflow.id}: "${outflow.dueDate}"`,
        { outflowId: outflow.id, date: outflow.dueDate },
      );
    }

    // FR-D-08 (c): Items dated on or before asOfDate are excluded from forecast window
    if (outflow.dueDate <= asOfDate) {
      continue;
    }

    if (outflow.dueDate > endDate) {
      continue;
    }

    const existing = outflowsByDate.get(outflow.dueDate) ?? [];
    existing.push({
      id: outflow.id,
      amountPaise: outflow.amountPaise,
      kind: outflow.kind,
      confidence: outflow.confidence,
    });
    outflowsByDate.set(outflow.dueDate, existing);
  }

  const days: DayProjection[] = [];
  let currentBalance = input.openingBalance.amountPaise;
  const safetyThreshold = input.safetyThresholdPaise ?? 0n;

  // Day 0: Opening balance as-of date
  days.push({
    date: asOfDate,
    dayIndex: 0,
    balancePaise: currentBalance,
    inflowPaise: 0n,
    outflowPaise: 0n,
    inflowItems: [],
    outflowItems: [],
  });

  let lowestBalancePaise = currentBalance;
  let lowestBalanceDate = asOfDate;
  const shortfalls: ShortfallReport[] = [];
  let firstShortfallDayIndex: number | null = null;

  for (let dayIndex = 1; dayIndex <= input.horizonDays; dayIndex++) {
    const date = addDays(asOfDate, dayIndex);
    const dayInflows = inflowsByDate.get(date) ?? [];
    const dayOutflows = outflowsByDate.get(date) ?? [];

    let sumInflow = 0n;
    for (const inf of dayInflows) {
      sumInflow += inf.amountPaise;
    }

    let sumOutflow = 0n;
    for (const out of dayOutflows) {
      sumOutflow += out.amountPaise;
    }

    currentBalance = currentBalance + sumInflow - sumOutflow;

    days.push({
      date,
      dayIndex,
      balancePaise: currentBalance,
      inflowPaise: sumInflow,
      outflowPaise: sumOutflow,
      inflowItems: dayInflows,
      outflowItems: dayOutflows,
    });

    if (currentBalance < lowestBalancePaise) {
      lowestBalancePaise = currentBalance;
      lowestBalanceDate = date;
    }

    // Shortfall detection: Rule 8
    if (currentBalance < safetyThreshold) {
      if (firstShortfallDayIndex === null) {
        firstShortfallDayIndex = dayIndex;
      }
      const shortfallPaise = safetyThreshold - currentBalance;

      // Rule 9: Collision candidates
      const candidates: CandidateCover[] = [];
      let reliableCoverSum = 0n;

      for (const cand of resolvedInflowCandidates) {
        if (cand.expectedDate === null) {
          candidates.push({
            kind: 'OverdueNoDate',
            refId: cand.id,
            coverPaise: cand.amountPaise,
            expectedDate: null,
            flag: 'AtRisk',
          });
        } else if (cand.expectedDate <= date) {
          candidates.push({
            kind: 'Milestone',
            refId: cand.id,
            coverPaise: cand.amountPaise,
            expectedDate: cand.expectedDate,
          });
          reliableCoverSum += cand.amountPaise;
        } else {
          candidates.push({
            kind: 'Milestone',
            refId: cand.id,
            coverPaise: cand.amountPaise,
            expectedDate: cand.expectedDate,
            flag: 'AfterVendorDue',
          });
        }
      }

      // Sort candidates by amount descending (Rule 9)
      candidates.sort((a, b) => {
        if (b.coverPaise < a.coverPaise) return -1;
        if (b.coverPaise > a.coverPaise) return 1;
        return 0;
      });

      const coveredPaise =
        reliableCoverSum < shortfallPaise ? reliableCoverSum : shortfallPaise;
      const remainingGapPaise = shortfallPaise - coveredPaise;

      shortfalls.push({
        shortfallDate: date,
        dayIndex,
        shortfallPaise,
        candidates,
        coveredPaise,
        remainingGapPaise,
      });
    }
  }

  const runwayDaysCount =
    firstShortfallDayIndex !== null ? firstShortfallDayIndex : input.horizonDays;

  return {
    horizonDays: input.horizonDays,
    asOfDate,
    startDate,
    endDate,
    days,
    lowestBalancePaise,
    lowestBalanceDate,
    shortfalls,
    runwayDaysCount,
  };
}

export function compareForecastScenarios(
  baselineInput: ForecastInput,
  whatIfOverrides: DelayOverride[],
): ScenarioComparison {
  const baseline = computeRunway(baselineInput);
  const whatIfInput: ForecastInput = {
    ...baselineInput,
    delayOverrides: whatIfOverrides,
  };
  const whatIf = computeRunway(whatIfInput);

  const lowestBalanceDeltaPaise =
    whatIf.lowestBalancePaise - baseline.lowestBalancePaise;
  const firstShortfallDayDifference =
    whatIf.runwayDaysCount - baseline.runwayDaysCount;

  return {
    baseline,
    whatIf,
    lowestBalanceDeltaPaise,
    firstShortfallDayDifference,
  };
}
