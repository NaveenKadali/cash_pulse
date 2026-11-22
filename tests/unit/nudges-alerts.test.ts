import { describe, expect, it } from 'vitest';
import {
  AlertService,
  InMemoryAlertRepository,
  NudgesError,
  computeDashboardSummary,
  generateAlerts,
} from '../../src/modules/nudges/index.js';
import type { RunwayResult } from '../../src/modules/forecast/index.js';
import type { AgingSummary, Payment } from '../../src/modules/invoicing/types.js';
import type { ProjectFinancialSummary } from '../../src/modules/projects/types.js';

describe('Cross-Module Alert Generation & Dashboard Totals (PRD FR-F-03..05, FR-J-02, NU-3, NU-7)', () => {
  const STUDIO_ID = 'studio-test-001';
  const OTHER_STUDIO_ID = 'studio-test-002';

  const mockForecast: RunwayResult = {
    days: [
      { date: '2026-11-20', balancePaise: 2400000n, inflowPaise: 0n, outflowPaise: 0n },
      { date: '2026-11-21', balancePaise: 2400000n, inflowPaise: 0n, outflowPaise: 0n },
      { date: '2026-12-04', balancePaise: -100000n, inflowPaise: 0n, outflowPaise: 7000000n },
    ],
    lowestBalancePaise: -100000n,
    lowestBalanceDate: '2026-12-04',
    shortfalls: [
      {
        shortfallDate: '2026-12-04',
        dayIndex: 2,
        shortfallPaise: 100000n,
        candidates: [],
        coveredPaise: 0n,
        remainingGapPaise: 100000n,
      },
    ],
  };

  const mockReceivables: AgingSummary = {
    buckets: { '0': 0n, '1–15': 5000000n, '16–30': 0n, '31–60': 0n, '61+': 0n },
    totalOutstandingPaise: 5000000n,
    totalOverduePaise: 5000000n,
    items: [
      {
        milestoneId: 'ms-1',
        projectId: 'proj-1',
        milestoneName: 'Shoot Completed',
        dueDate: '2026-11-10',
        daysOverdue: 10,
        bucket: '1–15',
        balancePaise: 5000000n, // ₹50,000 overdue
      },
    ],
  };

  const mockUnverifiedPayments: Payment[] = [
    {
      id: 'pay-claim-1',
      studioId: STUDIO_ID,
      milestoneId: 'ms-1',
      amountPaise: 5000000n,
      payerName: 'Kavita Sharma',
      paymentMode: 'UPI',
      verificationStatus: 'Unverified',
      receivedOn: '2026-11-20',
      voided: false,
    },
    {
      id: 'pay-voided',
      studioId: STUDIO_ID,
      milestoneId: 'ms-2',
      amountPaise: 2000000n,
      payerName: 'Voided User',
      paymentMode: 'UPI',
      verificationStatus: 'Unverified',
      receivedOn: '2026-11-19',
      voided: true, // Should be ignored!
    },
  ];

  const mockProjects: ProjectFinancialSummary[] = [
    {
      projectId: 'proj-hold',
      contractValuePaise: 20000000n,
      totalInvoicedPaise: 20000000n,
      verifiedCollectedPaise: 10000000n,
      unverifiedCollectedPaise: 0n,
      pendingClientBalancePaise: 10000000n,
      actualVendorCostsPaise: 4000000n,
      estimatedVendorCostsPaise: 0n,
      effectiveVendorCostsPaise: 4000000n,
      expectedContributionPaise: 16000000n,
      retentionPercentage: 80,
      stage: 'Album Layout Approved',
      financialStatus: 'Partially Settled',
      isDeliverableHold: true, // Hold active!
    },
    {
      projectId: 'proj-clean',
      contractValuePaise: 10000000n,
      totalInvoicedPaise: 10000000n,
      verifiedCollectedPaise: 10000000n,
      unverifiedCollectedPaise: 0n,
      pendingClientBalancePaise: 0n,
      actualVendorCostsPaise: 2000000n,
      estimatedVendorCostsPaise: 0n,
      effectiveVendorCostsPaise: 2000000n,
      expectedContributionPaise: 8000000n,
      retentionPercentage: 80,
      stage: 'Print & Delivered',
      financialStatus: 'Financially Closed',
      isDeliverableHold: false,
    },
  ];

  // -----------------------------------------------------------
  // Alert Generation Flow
  // -----------------------------------------------------------
  describe('generateAlerts', () => {
    it('generates deterministic alerts across all 4 canonical categories', () => {
      const alerts = generateAlerts(STUDIO_ID, {
        forecastRunway: mockForecast,
        receivablesAging: mockReceivables,
        unverifiedPayments: mockUnverifiedPayments,
        projectsSummary: mockProjects,
      });

      expect(alerts).toHaveLength(4);

      const kinds = alerts.map((a) => a.kind);
      expect(kinds).toContain('cash_deficit');
      expect(kinds).toContain('overdue_payment');
      expect(kinds).toContain('unverified_payment');
      expect(kinds).toContain('deliverable_hold');

      const cashAlert = alerts.find((a) => a.kind === 'cash_deficit')!;
      expect(cashAlert.amountPaise).toBe(100000n);
      expect(cashAlert.dueDate).toBe('2026-12-04');

      const unverifiedAlert = alerts.find((a) => a.kind === 'unverified_payment')!;
      expect(unverifiedAlert.message).toContain('Kavita Sharma');
    });

    // Adversarial Negative Tests
    it('produces zero alerts when finances are healthy and on schedule', () => {
      const healthyForecast: RunwayResult = {
        days: [{ date: '2026-11-20', balancePaise: 10000000n, inflowPaise: 0n, outflowPaise: 0n }],
        lowestBalancePaise: 10000000n,
        lowestBalanceDate: '2026-11-20',
        shortfalls: [], // No shortfalls
      };

      const healthyReceivables: AgingSummary = {
        buckets: { '0': 0n, '1–15': 0n, '16–30': 0n, '31–60': 0n, '61+': 0n },
        totalOutstandingPaise: 0n,
        totalOverduePaise: 0n,
        items: [], // No overdue items
      };

      const alerts = generateAlerts(STUDIO_ID, {
        forecastRunway: healthyForecast,
        receivablesAging: healthyReceivables,
        unverifiedPayments: [],
        projectsSummary: [],
      });

      expect(alerts).toHaveLength(0);
    });

    it('ignores voided unverified payments to prevent ghost alerts', () => {
      const onlyVoidedPayments: Payment[] = [
        {
          id: 'pay-voided-1',
          studioId: STUDIO_ID,
          milestoneId: 'ms-1',
          amountPaise: 5000000n,
          payerName: 'Spam User',
          paymentMode: 'UPI',
          verificationStatus: 'Unverified',
          receivedOn: '2026-11-20',
          voided: true, // VOIDED
        },
      ];

      const alerts = generateAlerts(STUDIO_ID, {
        unverifiedPayments: onlyVoidedPayments,
      });

      expect(alerts).toHaveLength(0);
    });

    it('does NOT flag deliverable_hold alert when hold flag is false', () => {
      const cleanProject: ProjectFinancialSummary = {
        projectId: 'proj-no-hold',
        contractValuePaise: 10000000n,
        totalInvoicedPaise: 10000000n,
        verifiedCollectedPaise: 10000000n,
        unverifiedCollectedPaise: 0n,
        pendingClientBalancePaise: 0n,
        actualVendorCostsPaise: 0n,
        estimatedVendorCostsPaise: 0n,
        effectiveVendorCostsPaise: 0n,
        expectedContributionPaise: 10000000n,
        retentionPercentage: 100,
        stage: 'Album Layout Approved',
        financialStatus: 'Financially Closed',
        isDeliverableHold: false,
      };

      const alerts = generateAlerts(STUDIO_ID, {
        projectsSummary: [cleanProject],
      });

      expect(alerts).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Dashboard Summary Aggregator (NU-7)
  // -----------------------------------------------------------
  describe('computeDashboardSummary', () => {
    it('aggregates available cash, runway days, and active counts into a unified view', () => {
      const summary = computeDashboardSummary(STUDIO_ID, {
        forecastRunway: mockForecast,
        receivablesAging: mockReceivables,
        unverifiedPayments: mockUnverifiedPayments,
        projectsSummary: mockProjects,
      });

      expect(summary.studioId).toBe(STUDIO_ID);
      expect(summary.availableCashPaise).toBe(2400000n);
      expect(summary.runwayDays).toBe(2); // Shortfall is on index 2 (Day 14)
      expect(summary.totalOverdueReceivablesPaise).toBe(5000000n);
      expect(summary.unverifiedPaymentsCount).toBe(1); // Excludes voided
      expect(summary.activeAlertsCount).toBe(4);
      expect(summary.alerts).toHaveLength(4);
    });
  });

  // -----------------------------------------------------------
  // AlertService (Dismissal & Resolution)
  // -----------------------------------------------------------
  describe('AlertService', () => {
    it('syncs, lists, dismisses, and resolves alerts', async () => {
      const repo = new InMemoryAlertRepository();
      const service = new AlertService(repo);

      const rawAlerts = generateAlerts(STUDIO_ID, {
        receivablesAging: mockReceivables,
      });

      await service.syncAlerts(STUDIO_ID, rawAlerts);

      const openList = await service.listAlerts(STUDIO_ID, 'Open');
      expect(openList).toHaveLength(1);

      // Dismiss alert
      const dismissed = await service.dismissAlert(STUDIO_ID, rawAlerts[0]!.id);
      expect(dismissed.status).toBe('Dismissed');

      // Now 0 open alerts
      const afterDismiss = await service.listAlerts(STUDIO_ID, 'Open');
      expect(afterDismiss).toHaveLength(0);

      // Resolve alert
      const resolved = await service.resolveAlert(STUDIO_ID, rawAlerts[0]!.id);
      expect(resolved.status).toBe('Resolved');
    });

    // Adversarial Negative Tests
    it('rejects dismiss or resolve on non-existent alert', async () => {
      const repo = new InMemoryAlertRepository();
      const service = new AlertService(repo);

      await expect(service.dismissAlert(STUDIO_ID, 'fake-alert-id')).rejects.toThrow(
        NudgesError,
      );
      await expect(service.resolveAlert(STUDIO_ID, 'fake-alert-id')).rejects.toThrow(
        NudgesError,
      );
    });

    it('enforces studio tenancy on alert lookup', async () => {
      const repo = new InMemoryAlertRepository();
      const service = new AlertService(repo);

      const rawAlerts = generateAlerts(STUDIO_ID, {
        receivablesAging: mockReceivables,
      });
      await service.syncAlerts(STUDIO_ID, rawAlerts);

      // Other studio cannot dismiss this alert
      await expect(
        service.dismissAlert(OTHER_STUDIO_ID, rawAlerts[0]!.id),
      ).rejects.toThrow(NudgesError);
    });
  });
});
