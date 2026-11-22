// Projects module types: client records and project lifecycle (PRD FR-A-01, FR-E-01..04, LLD-001).

export type EventType =
  | 'Wedding'
  | 'Pre-Wedding'
  | 'Engagement'
  | 'Birthday'
  | 'Corporate'
  | 'Anniversary'
  | 'Other';

export type ProjectStage =
  | 'Booking'
  | 'Vendor Setup'
  | 'Shoot Completed'
  | 'Digital Proofs Ready'
  | 'Album Layout Approved'
  | 'Print & Delivered'
  | 'Financial Closed';

export type FinancialStatus =
  | 'Financially Open'
  | 'Partially Settled'
  | 'Financially Closed';

export const PROJECT_STAGES_ORDER: readonly ProjectStage[] = [
  'Booking',
  'Vendor Setup',
  'Shoot Completed',
  'Digital Proofs Ready',
  'Album Layout Approved',
  'Print & Delivered',
  'Financial Closed',
] as const;

export interface Client {
  id: string;
  studioId: string;
  whatsappPhone: string;
  secondaryPhone: string | null;
  city: string | null;
}

export interface CreateClientInput {
  studioId: string;
  whatsappPhone: string;
  secondaryPhone?: string | null;
  city?: string | null;
}

export interface UpdateClientInput {
  whatsappPhone?: string;
  secondaryPhone?: string | null;
  city?: string | null;
}

export interface ClientRepository {
  findById(studioId: string, id: string): Promise<Client | null>;
  listByStudio(studioId: string): Promise<Client[]>;
  insert(client: Client): Promise<void>;
  update(client: Client): Promise<void>;
}

export interface Project {
  id: string;
  studioId: string;
  clientId: string;
  eventType: EventType;
  venueLocation: string | null;
  primaryContactPerson: string;
  targetAlbumDeliveryDate: string | null;
  stage: ProjectStage;
  financialStatus: FinancialStatus;
  contractValuePaise: bigint;
  notes?: string | null;
  createdAt: string;
}

export interface CreateProjectInput {
  studioId: string;
  clientId: string;
  eventType: EventType;
  primaryContactPerson: string;
  contractValuePaise: bigint;
  venueLocation?: string | null;
  targetAlbumDeliveryDate?: string | null;
  notes?: string | null;
}

export interface ProjectRepository {
  findById(studioId: string, id: string): Promise<Project | null>;
  listByStudio(studioId: string): Promise<Project[]>;
  countActiveByStudio(studioId: string): Promise<number>;
  insert(project: Project): Promise<void>;
  update(project: Project): Promise<void>;
}

// -------------------------------------------------------------
// Stage Change Log (PRD FR-E-02, PR-3, migration 0001 stage_change)
// -------------------------------------------------------------

export interface StageChange {
  id: string;
  projectId: string;
  fromStage: ProjectStage;
  toStage: ProjectStage;
  changedBy: string; // user id
  notes?: string | null;
  changedAt: string;
}

export interface StageChangeRepository {
  insert(change: StageChange): Promise<void>;
  listByProject(projectId: string): Promise<StageChange[]>;
}

// -------------------------------------------------------------
// Project Financial Summary (PRD FR-C-01, PR-7)
// -------------------------------------------------------------

export interface ProjectFinancialSummary {
  projectId: string;
  contractValuePaise: bigint;
  totalInvoicedPaise: bigint;
  verifiedCollectedPaise: bigint;
  unverifiedCollectedPaise: bigint;
  pendingClientBalancePaise: bigint;
  actualVendorCostsPaise: bigint;
  estimatedVendorCostsPaise: bigint;
  effectiveVendorCostsPaise: bigint;
  expectedContributionPaise: bigint;
  retentionPercentage: number | null;
  stage: ProjectStage;
  financialStatus: FinancialStatus;
  isDeliverableHold: boolean;
}
