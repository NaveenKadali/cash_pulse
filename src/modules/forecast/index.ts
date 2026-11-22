// Forecast: cash-flow projections and runway calculations.

export {
  computeRunway,
  compareForecastScenarios,
} from './engine';
export {
  DomainError,
  PlanLimitError,
  ValidationError,
} from './errors';
export type {
  CandidateCover,
  DayMovementInflow,
  DayMovementOutflow,
  DayProjection,
  DelayOverride,
  ForecastInput,
  InflowItem,
  OpeningBalanceInput,
  OutflowItem,
  PlanTier,
  RunwayResult,
  ScenarioComparison,
  ShortfallReport,
} from './types';
