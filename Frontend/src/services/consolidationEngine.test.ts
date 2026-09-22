import { describe, expect, it } from 'vitest';
import { calculateEmi, compareConsolidation } from './consolidationEngine';

describe('consolidation calculation engine', () => {
  it('calculates zero-interest EMI deterministically', () => {
    expect(calculateEmi(120000, 0, 12)).toBe(10000);
  });

  it('includes fees in total repayment without changing EMI', () => {
    const result = compareConsolidation({
      loans: [{ type: 'Card', outstanding: 100000, rate: 18, tenure: 12, emi: 9168.33 }],
      consolidationAmount: 100000,
      consolidationRate: 18,
      consolidationTenure: 12,
      processingFee: 2500,
      foreclosureCharges: 1500,
      monthlyIncome: 50000,
      extraMonthlyPayment: 0,
    });

    expect(result.consolidated.fees).toBe(4000);
    expect(result.consolidated.emi).toBeCloseTo(result.existing.emi, 0);
    expect(result.consolidated.totalRepayment).toBeGreaterThan(result.existing.totalRepayment);
  });

  it('detects lower EMI with higher total cost', () => {
    const result = compareConsolidation({
      loans: [{ type: 'Personal loan', outstanding: 100000, rate: 24, tenure: 12, emi: 9456.15 }],
      consolidationAmount: 100000,
      consolidationRate: 10,
      consolidationTenure: 60,
      processingFee: 2000,
      foreclosureCharges: 0,
      monthlyIncome: 50000,
      extraMonthlyPayment: 0,
    });

    expect(result.consolidated.emi).toBeLessThan(result.existing.emi);
    expect(result.consolidated.months).toBeGreaterThan(result.existing.months);
    expect(result.verdict).toBe('lower-emi-higher-cost');
    expect(result.warning).toBe('LOWER EMI, HIGHER TOTAL COST');
  });

  it('recognizes a genuine overall saving', () => {
    const result = compareConsolidation({
      loans: [{ type: 'Credit card', outstanding: 100000, rate: 36, tenure: 24, emi: 5909.80 }],
      consolidationAmount: 100000,
      consolidationRate: 12,
      consolidationTenure: 18,
      processingFee: 500,
      foreclosureCharges: 0,
      monthlyIncome: 50000,
      extraMonthlyPayment: 0,
    });

    expect(result.verdict).toBe('save');
    expect(result.overallCostDifference).toBeLessThan(0);
  });
});
