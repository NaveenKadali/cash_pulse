// Nudges: reminders and alerts about due and overdue money.
export {
  formatRupees,
  renderFriendlyTemplate,
  renderFormalTemplate,
  renderFirmTemplate,
  renderTemplate,
  NudgesError,
  TemplateValidationError,
} from './templates';

export {
  composeFollowUpMessage,
  normalizePhoneNumber,
} from './messages';

export {
  generateAlerts,
  computeDashboardSummary,
  AlertService,
  InMemoryAlertRepository,
} from './alerts';

export type {
  TemplateTone,
  FriendlyTemplateParams,
  FormalTemplateParams,
  FirmTemplateParams,
  TemplateParamsByTone,
} from './templates';

export type {
  ComposeNudgeInput,
  ComposedNudge,
} from './messages';

export type {
  AlertKind,
  AlertStatus,
  Alert,
  AlertRepository,
  GenerateAlertsInput,
  DashboardSummary,
  DashboardSummaryInput,
} from './alerts';
