import { randomUUID } from 'node:crypto';
import { todayInKolkata } from '../../infrastructure/time';
import type { DayProjection, RunwayResult } from '../forecast/index';
import type { AgingSummary, Payment } from '../invoicing/types';
import type { ProjectFinancialSummary } from '../projects/types';
import type { PayablesAgingReport } from '../vendors/types';
import { NudgesError } from './templates';

export type AlertKind =
  | 'overdue_payment'
  | 'cash_deficit'
  | 'unverified_payment'
  | 'deliverable_hold';

export type AlertStatus = 'Open' | 'Dismissed' | 'Resolved';

export interface Alert {
  id: string;
  studioId: string;
  projectId: string | null;
  kind: AlertKind;
  status: AlertStatus;
  title: string;
  message: string;
  amountPaise?: bigint;
  dueDate?: string | null;
  createdAt: string;
}

export interface AlertRepository {
  findById(studioId: string, id: string): Promise<Alert | null>;
  listByStudio(studioId: string, status?: AlertStatus): Promise<Alert[]>;
  insert(alert: Alert): Promise<void>;
  update(alert: Alert): Promise<void>;
}

export class InMemoryAlertRepository implements AlertRepository {
  private readonly store = new Map<string, Alert>();

  async findById(studioId: string, id: string): Promise<Alert | null> {
    const a = this.store.get(id);
    if (!a || a.studioId !== studioId) return null;
    return { ...a };
  }

  async listByStudio(studioId: string, status?: AlertStatus): Promise<Alert[]> {
    return Array.from(this.store.values())
      .filter((a) => a.studioId === studioId && (!status || a.status === status))
      .map((a) => ({ ...a }));
  }

  async insert(alert: Alert): Promise<void> {
    this.store.set(alert.id, { ...alert });
  }

  async update(alert: Alert): Promise<void> {
    this.store.set(alert.id, { ...alert });
  }

  clear(): void {
    this.store.clear();
  }
}

export interface GenerateAlertsInput {
  forecastRunway?: RunwayResult;
  receivablesAging?: AgingSummary;
  unverifiedPayments?: Payment[];
  projectsSummary?: ProjectFinancialSummary[];
}

/**
 * Deterministically generates alerts across modules without recalculating figures (PRD FR-F-03..05, NU-3).
 * Pure and read-only.
 */
export function generateAlerts(
  studioId: string,
  input: GenerateAlertsInput,
  nowDate: string = todayInKolkata(),
): Alert[] {
  const alerts: Alert[] = [];

  // 1. Cash Deficit Alert: from Forecast Runway
  if (input.forecastRunway && input.forecastRunway.shortfalls.length > 0) {
    const earliestShortfall = input.forecastRunway.shortfalls[0]!;
    alerts.push({
      id: randomUUID(),
      studioId,
      projectId: null,
      kind: 'cash_deficit',
      status: 'Open',
      title: 'Projected Cash Shortfall',
      message: `A projected cash deficit of ₹${(earliestShortfall.shortfallPaise / 100n).toString()} occurs on ${earliestShortfall.shortfallDate}.`,
      amountPaise: earliestShortfall.shortfallPaise,
      dueDate: earliestShortfall.shortfallDate,
      createdAt: nowDate,
    });
  }

  // 2. Overdue Payment Alerts: from Invoicing Receivables Aging
  if (input.receivablesAging) {
    for (const item of input.receivablesAging.items) {
      if (item.daysOverdue > 0 && item.balancePaise > 0n) {
        alerts.push({
          id: randomUUID(),
          studioId,
          projectId: item.projectId,
          kind: 'overdue_payment',
          status: 'Open',
          title: `Overdue Milestone: ${item.milestoneName}`,
          message: `Payment of ₹${(item.balancePaise / 100n).toString()} is overdue by ${item.daysOverdue} days.`,
          amountPaise: item.balancePaise,
          dueDate: item.dueDate,
          createdAt: nowDate,
        });
      }
    }
  }

  // 3. Unverified Payment Alerts: Client "I have paid" submissions
  if (input.unverifiedPayments) {
    for (const payment of input.unverifiedPayments) {
      if (!payment.voided && payment.verificationStatus === 'Unverified') {
        alerts.push({
          id: randomUUID(),
          studioId,
          projectId: null,
          kind: 'unverified_payment',
          status: 'Open',
          title: 'Payment Submitted – Verify & Settle',
          message: `${payment.payerName} submitted a payment of ₹${(payment.amountPaise / 100n).toString()} via ${payment.paymentMode}.`,
          amountPaise: payment.amountPaise,
          dueDate: payment.receivedOn,
          createdAt: nowDate,
        });
      }
    }
  }

  // 4. Deliverable Hold Alerts: Projects on hold due to pending balances
  if (input.projectsSummary) {
    for (const proj of input.projectsSummary) {
      if (proj.isDeliverableHold) {
        alerts.push({
          id: randomUUID(),
          studioId,
          projectId: proj.projectId,
          kind: 'deliverable_hold',
          status: 'Open',
          title: `Deliverables on Hold: Project ${proj.projectId}`,
          message: `High-resolution downloads and print releases remain on hold until pending balance of ₹${(proj.pendingClientBalancePaise / 100n).toString()} is settled.`,
          amountPaise: proj.pendingClientBalancePaise,
          dueDate: null,
          createdAt: nowDate,
        });
      }
    }
  }

  return alerts;
}

export interface DashboardSummary {
  studioId: string;
  availableCashPaise: bigint;
  runwayDays: number;
  totalOverdueReceivablesPaise: bigint;
  totalUpcomingPayablesPaise: bigint;
  unverifiedPaymentsCount: number;
  activeAlertsCount: number;
  alerts: Alert[];
}

export interface DashboardSummaryInput {
  forecastRunway?: RunwayResult;
  receivablesAging?: AgingSummary;
  payablesAging?: PayablesAgingReport;
  unverifiedPayments?: Payment[];
  projectsSummary?: ProjectFinancialSummary[];
}

/**
 * Computes dashboard totals & KPIs in a single aggregated read (PRD FR-J-02, NU-7).
 */
export function computeDashboardSummary(
  studioId: string,
  input: DashboardSummaryInput,
  nowDate: string = todayInKolkata(),
): DashboardSummary {
  const alerts = generateAlerts(studioId, input, nowDate);

  // Available cash from today's forecast balance or opening balance
  let availableCashPaise = 0n;
  let runwayDays = 30; // default horizon

  if (input.forecastRunway) {
    if (input.forecastRunway.days.length > 0) {
      availableCashPaise = input.forecastRunway.days[0]!.balancePaise;
    }
    // Days until first shortfall or end of horizon
    if (input.forecastRunway.shortfalls.length > 0) {
      const earliest = input.forecastRunway.shortfalls[0]!;
      const idx = input.forecastRunway.days.findIndex(
        (d: DayProjection) => d.date === earliest.shortfallDate,
      );
      runwayDays = idx >= 0 ? idx : 0;
    } else {
      runwayDays = input.forecastRunway.days.length;
    }
  }

  const totalOverdueReceivablesPaise = input.receivablesAging?.totalOverduePaise ?? 0n;
  const totalUpcomingPayablesPaise = input.payablesAging?.totalPayablePaise ?? 0n;
  const unverifiedPaymentsCount =
    input.unverifiedPayments?.filter((p) => !p.voided && p.verificationStatus === 'Unverified')
      .length ?? 0;

  return {
    studioId,
    availableCashPaise,
    runwayDays,
    totalOverdueReceivablesPaise,
    totalUpcomingPayablesPaise,
    unverifiedPaymentsCount,
    activeAlertsCount: alerts.length,
    alerts,
  };
}

export class AlertService {
  constructor(private readonly repo: AlertRepository = new InMemoryAlertRepository()) {}

  async syncAlerts(studioId: string, alerts: Alert[]): Promise<Alert[]> {
    for (const alert of alerts) {
      await this.repo.insert(alert);
    }
    return alerts;
  }

  async listAlerts(studioId: string, status?: AlertStatus): Promise<Alert[]> {
    return this.repo.listByStudio(studioId, status);
  }

  async dismissAlert(studioId: string, alertId: string): Promise<Alert> {
    const alert = await this.repo.findById(studioId, alertId);
    if (!alert) {
      throw new NudgesError('ALERT_NOT_FOUND', `Alert "${alertId}" was not found`);
    }
    alert.status = 'Dismissed';
    await this.repo.update(alert);
    return alert;
  }

  async resolveAlert(studioId: string, alertId: string): Promise<Alert> {
    const alert = await this.repo.findById(studioId, alertId);
    if (!alert) {
      throw new NudgesError('ALERT_NOT_FOUND', `Alert "${alertId}" was not found`);
    }
    alert.status = 'Resolved';
    await this.repo.update(alert);
    return alert;
  }
}
