import type { ProjectStage } from '../projects/types';

export type ClientLinkStatus = 'Active' | 'Revoked' | 'Expired';

export interface ClientLink {
  id: string;
  studioId: string;
  projectId: string;
  tokenHash: string; // SHA-256
  status: ClientLinkStatus;
  expiresAt: string; // YYYY-MM-DD
  createdAt: string; // YYYY-MM-DD
}

export interface ClientPortalPaymentRecord {
  date: string;
  amountPaise: bigint;
  method: string;
}

export interface ClientPortalReadModel {
  projectId: string;
  projectName: string;
  eventType: string;
  primaryContactPerson: string;
  targetAlbumDeliveryDate: string | null;
  totalPackageAmountPaise: bigint;
  amountPaidPaise: bigint;
  pendingBalancePaise: bigint;
  deliverableStage: ProjectStage;
  isDeliverableHold: boolean;
  studioName: string;
  studioUpiId: string;
  studioContactPhone: string | null;
  upiDeepLink: string | null;
  paymentHistory: ClientPortalPaymentRecord[];
}

export interface ClientLinkRepository {
  findById(studioId: string, id: string): Promise<ClientLink | null>;
  findByTokenHash(tokenHash: string): Promise<ClientLink | null>;
  listByProject(studioId: string, projectId: string): Promise<ClientLink[]>;
  insert(link: ClientLink): Promise<void>;
  update(link: ClientLink): Promise<void>;
}
