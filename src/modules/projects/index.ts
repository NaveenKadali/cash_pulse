// Projects module: Client directory, Project lifecycle, and Flexible Milestone management.
export {
  ClientService,
  InMemoryClientRepository,
} from './clients';

export {
  ProjectService,
  InMemoryProjectRepository,
  InMemoryStageChangeRepository,
} from './projects';

export {
  validateEventType,
  deriveFinancialStatus,
  validateStageTransition,
  resolveEffectiveStage,
} from './lifecycle';

export {
  createCustomMilestoneSchedule,
  autoAdjustMilestonesForPayment,
} from './milestones';

export {
  calculateProjectContribution,
  isDeliverableHoldActive,
  computeProjectFinancialSummary,
} from './summary';

export {
  ProjectsError,
  ClientNotFoundError,
  ClientValidationError,
  ProjectNotFoundError,
  ProjectValidationError,
  InvalidStageTransitionError,
  ProjectPlanLimitError,
} from './errors';

export { PROJECT_STAGES_ORDER } from './types';

export type {
  EventType,
  ProjectStage,
  FinancialStatus,
  Client,
  CreateClientInput,
  UpdateClientInput,
  ClientRepository,
  Project,
  CreateProjectInput,
  ProjectRepository,
  StageChange,
  StageChangeRepository,
  ProjectFinancialSummary,
} from './types';

export type { ComputeSummaryInput } from './summary';
export type { Milestone, CustomMilestoneSplitInput } from './milestones';
