import { describe, expect, it } from 'vitest';
import { buildAaravPixelsDataset } from '../../src/infrastructure/demo/aarav-pixels.js';
import { computeRunway } from '../../src/modules/forecast/engine.js';
import type { ForecastInput } from '../../src/modules/forecast/types.js';

describe('UI-10 Aarav Pixels demo dataset', () => {
  const asOfDate = '2026-05-01';
  const dataset = buildAaravPixelsDataset(asOfDate);
  const { forecastInput } = dataset;

  it('has the hard PRD/LLD figures', () => {
    expect(dataset.forecastInput.openingBalance.amountPaise).toBe(2400000n);
    expect(dataset.forecastInput.openingBalance.asOfDate).toBe(asOfDate);

    const verma = forecastInput.inflows.find((i) => i.projectId === 'proj-verma');
    expect(verma?.amountPaise).toBe(4500000n);

    const printLab = forecastInput.outflows.find((o) => o.id === 'bill-print-lab');
    expect(printLab?.amountPaise).toBe(7000000n);
  });

  it('has the required entity counts', () => {
    expect(dataset.projects).toHaveLength(5);
    expect(dataset.milestones).toHaveLength(15);
    expect(dataset.vendorBills).toHaveLength(8);
  });

  it('contains exactly two in-window movements: Verma inflow (+10) and Print-Lab outflow (+14)', () => {
    expect(forecastInput.inflows).toHaveLength(1);
    expect(forecastInput.outflows).toHaveLength(1);
    expect(forecastInput.inflows[0]?.expectedDate).toBe('2026-05-11');
    expect(forecastInput.outflows[0]?.dueDate).toBe('2026-05-15');
  });

  it('computes the expected runway balances with the real engine', () => {
    const result = computeRunway(forecastInput);

    for (let d = 0; d <= 9; d++) {
      expect(result.days[d]?.balancePaise).toBe(2400000n);
    }
    for (let d = 10; d <= 13; d++) {
      expect(result.days[d]?.balancePaise).toBe(6900000n);
    }
    expect(result.days[14]?.balancePaise).toBe(-100000n);
  });

  it('shows the Day-14 deficit of -4,600,000 paise when the Verma inflow is removed', () => {
    const withoutInflow: ForecastInput = { ...forecastInput, inflows: [] };
    const result = computeRunway(withoutInflow);

    expect(result.days[14]?.balancePaise).toBe(-4600000n);
  });
});
