import { randomUUID } from 'node:crypto';
import { addDays, isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import { isDeliverableHoldActive } from '../projects/summary';
import type { Project, ProjectRepository } from '../projects/types';
import {
  ClientLinkInactiveError,
  ClientLinkNotFoundError,
  ClientPortalValidationError,
} from './errors';
import {
  generateClientToken,
  hashClientToken,
  validateTokenEntropy,
} from './tokens';
import type {
  ClientLink,
  ClientLinkRepository,
  ClientPortalPaymentRecord,
  ClientPortalReadModel,
} from './types';

export interface PaymentRecord {
  amountPaise: bigint;
  receivedOn: string;
  paymentMode: string;
  voided: boolean;
}

export interface StudioInfo {
  id: string;
  name: string;
  upiId: string;
  contactPhone?: string | null;
}

export interface SubmitPaymentClaimInput {
  amountPaise: bigint;
  payerName: string;
  transactionUtrRef?: string;
}

export interface ClientPaymentClaimResult {
  projectId: string;
  amountPaise: bigint;
  status: 'Unverified';
  submittedAt: string;
  message: string;
}

export class InMemoryClientLinkRepository implements ClientLinkRepository {
  private readonly store = new Map<string, ClientLink>();

  async findById(studioId: string, id: string): Promise<ClientLink | null> {
    const item = this.store.get(id);
    if (!item || item.studioId !== studioId) return null;
    return { ...item };
  }

  async findByTokenHash(tokenHash: string): Promise<ClientLink | null> {
    for (const item of this.store.values()) {
      if (item.tokenHash === tokenHash) {
        return { ...item };
      }
    }
    return null;
  }

  async listByProject(studioId: string, projectId: string): Promise<ClientLink[]> {
    return Array.from(this.store.values())
      .filter((link) => link.studioId === studioId && link.projectId === projectId)
      .map((link) => ({ ...link }));
  }

  async insert(link: ClientLink): Promise<void> {
    this.store.set(link.id, { ...link });
  }

  async update(link: ClientLink): Promise<void> {
    this.store.set(link.id, { ...link });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Builds dynamic NPCI-compliant UPI deep link (PRD FR-G-03).
 * Format: upi://pay?pa=<studio-upi-id>&pn=<studio-name>&am=<amount>&tn=<note>&cu=INR
 */
export function buildUpiDeepLink(
  upiId: string,
  studioName: string,
  amountPaise: bigint,
  note: string,
): string {
  const rupees = (amountPaise / 100n).toString();
  const minor = (amountPaise % 100n).toString().padStart(2, '0');
  const amountStr = `${rupees}.${minor}`;

  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: studioName.trim(),
    am: amountStr,
    tn: note.trim(),
    cu: 'INR',
  });

  return `upi://pay?${params.toString()}`;
}

export class ClientPortalService {
  constructor(
    private readonly linkRepo: ClientLinkRepository = new InMemoryClientLinkRepository(),
    private readonly projectRepo: ProjectRepository,
    private readonly getPaymentsForProject: (
      studioId: string,
      projectId: string,
    ) => Promise<PaymentRecord[]>,
    private readonly getStudioInfo: (studioId: string) => Promise<StudioInfo | null>,
    private readonly onRecordPaymentClaim?: (
      studioId: string,
      projectId: string,
      amountPaise: bigint,
      payerName: string,
      transactionUtrRef?: string,
    ) => Promise<void>,
  ) {}

  /**
   * Issues a new unguessable 128-bit client link (PRD FR-G-01).
   */
  async issueLink(
    studioId: string,
    projectId: string,
    expiryDays: number = 30,
    nowDate: string = todayInKolkata(),
  ): Promise<{ rawToken: string; clientLink: ClientLink; clientPageUrl: string }> {
    if (!studioId) throw new ClientPortalValidationError('studioId is required');
    if (!projectId) throw new ClientPortalValidationError('projectId is required');
    if (expiryDays <= 0) {
      throw new ClientPortalValidationError('expiryDays must be greater than 0');
    }

    const project = await this.projectRepo.findById(studioId, projectId);
    if (!project) {
      throw new ClientPortalValidationError(`Project "${projectId}" not found in studio`, {
        projectId,
      });
    }

    const rawToken = generateClientToken();
    validateTokenEntropy(rawToken);
    const tokenHash = hashClientToken(rawToken);

    const clientLink: ClientLink = {
      id: randomUUID(),
      studioId,
      projectId,
      tokenHash,
      status: 'Active',
      expiresAt: addDays(nowDate, expiryDays),
      createdAt: nowDate,
    };

    await this.linkRepo.insert(clientLink);

    return {
      rawToken,
      clientLink,
      clientPageUrl: `/p/${rawToken}`,
    };
  }

  /**
   * Immediately revokes a client link (PRD FR-G-07).
   */
  async revokeLink(studioId: string, linkId: string): Promise<void> {
    const link = await this.linkRepo.findById(studioId, linkId);
    if (!link) {
      throw new ClientLinkNotFoundError(linkId);
    }
    link.status = 'Revoked';
    await this.linkRepo.update(link);
  }

  /**
   * Updates expiration date of a client link (PRD CP-7).
   */
  async updateExpiry(studioId: string, linkId: string, newExpiryDate: string): Promise<ClientLink> {
    if (!isValidCalendarDate(newExpiryDate)) {
      throw new ClientPortalValidationError(
        `Invalid calendar date format for expiry: "${newExpiryDate}"`,
      );
    }

    const link = await this.linkRepo.findById(studioId, linkId);
    if (!link) {
      throw new ClientLinkNotFoundError(linkId);
    }

    link.expiresAt = newExpiryDate;
    await this.linkRepo.update(link);
    return link;
  }

  /**
   * Resolves scrubbed read-model for `/p/:token` (PRD FR-G-02, FR-G-06).
   * Strictly sanitizes sensitive internal fields: NO vendor costs, NO vendor names,
   * NO profit margins, NO internal studio notes.
   */
  async getClientPortalData(
    rawToken: string,
    asOfDate: string = todayInKolkata(),
  ): Promise<ClientPortalReadModel> {
    validateTokenEntropy(rawToken);
    const tokenHash = hashClientToken(rawToken);

    const link = await this.linkRepo.findByTokenHash(tokenHash);

    // If link is missing or marked Revoked, immediate refusal with generic inactive error (FR-G-07)
    if (!link || link.status === 'Revoked') {
      throw new ClientLinkInactiveError('Link is no longer active');
    }

    // Expiry check
    if (asOfDate > link.expiresAt || link.status === 'Expired') {
      if (link.status !== 'Expired') {
        link.status = 'Expired';
        await this.linkRepo.update(link);
      }
      throw new ClientLinkInactiveError('Link is no longer active');
    }

    const project = await this.projectRepo.findById(link.studioId, link.projectId);
    if (!project) {
      throw new ClientLinkInactiveError('Link is no longer active');
    }

    const studio = await this.getStudioInfo(link.studioId);
    if (!studio) {
      throw new ClientLinkInactiveError('Link is no longer active');
    }

    const payments = await this.getPaymentsForProject(link.studioId, link.projectId);
    const activePayments = payments.filter((p) => !p.voided);

    const totalPaidPaise = activePayments.reduce((acc, p) => acc + p.amountPaise, 0n);
    const pendingBalancePaise = project.contractValuePaise - totalPaidPaise;
    const cleanPendingBalance = pendingBalancePaise < 0n ? 0n : pendingBalancePaise;

    const isHold = isDeliverableHoldActive(project.stage, cleanPendingBalance, true);

    const paymentHistory: ClientPortalPaymentRecord[] = activePayments.map((p) => ({
      date: p.receivedOn,
      amountPaise: p.amountPaise,
      method: p.paymentMode,
    }));

    // Dynamic UPI deep link if balance remains
    let upiDeepLink: string | null = null;
    if (cleanPendingBalance > 0n && studio.upiId) {
      upiDeepLink = buildUpiDeepLink(
        studio.upiId,
        studio.name,
        cleanPendingBalance,
        `Payment for ${project.eventType} - ${project.primaryContactPerson}`,
      );
    }

    return {
      projectId: project.id,
      projectName: `${project.eventType} - ${project.primaryContactPerson}`,
      eventType: project.eventType,
      primaryContactPerson: project.primaryContactPerson,
      targetAlbumDeliveryDate: project.targetAlbumDeliveryDate,
      totalPackageAmountPaise: project.contractValuePaise,
      amountPaidPaise: totalPaidPaise,
      pendingBalancePaise: cleanPendingBalance,
      deliverableStage: project.stage,
      isDeliverableHold: isHold,
      studioName: studio.name,
      studioUpiId: studio.upiId,
      studioContactPhone: studio.contactPhone ?? null,
      upiDeepLink,
      paymentHistory,
    };
  }

  /**
   * Submits a client's "I have paid" claim (PRD FR-G-04, CP-4).
   * Does NOT confirm payment; creates an unverified claim for owner verification.
   */
  async submitPaymentClaim(
    rawToken: string,
    input: SubmitPaymentClaimInput,
    nowDate: string = todayInKolkata(),
  ): Promise<ClientPaymentClaimResult> {
    validateTokenEntropy(rawToken);
    const tokenHash = hashClientToken(rawToken);

    const link = await this.linkRepo.findByTokenHash(tokenHash);
    if (!link || link.status !== 'Active') {
      throw new ClientLinkInactiveError('Link is no longer active');
    }

    if (input.amountPaise <= 0n) {
      throw new ClientPortalValidationError('Claim amount must be a positive bigint paise');
    }

    if (!input.payerName || input.payerName.trim() === '') {
      throw new ClientPortalValidationError('Payer name is required');
    }

    if (this.onRecordPaymentClaim) {
      await this.onRecordPaymentClaim(
        link.studioId,
        link.projectId,
        input.amountPaise,
        input.payerName.trim(),
        input.transactionUtrRef?.trim(),
      );
    }

    return {
      projectId: link.projectId,
      amountPaise: input.amountPaise,
      status: 'Unverified',
      submittedAt: nowDate,
      message: 'Payment submitted – verify & settle',
    };
  }
}
