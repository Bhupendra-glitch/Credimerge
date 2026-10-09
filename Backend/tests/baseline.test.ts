import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEmi, totalInterest, buildAmortizationTable, aggregateLoans, Loan } from '../src/services/emiService';

describe('Baseline Core Calculation Suite', () => {
  it('accurately calculates monthly EMI for standard loans', () => {
    // Principal: 100,000, 12% annual rate, 12 months
    const emi = calculateEmi(100000, 12, 12);
    // Standard EMI formula: 100000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) = ~8884.88
    assert.ok(Math.abs(emi - 8884.88) < 1.0, `Expected ~8884.88, got ${emi}`);
  });

  it('handles 0% interest loans correctly', () => {
    const emi = calculateEmi(60000, 0, 12);
    assert.equal(emi, 5000);
  });

  it('calculates total interest accurately', () => {
    const interest = totalInterest(100000, 12, 12);
    assert.ok(interest > 6000 && interest < 7000, `Interest was ${interest}`);
  });

  it('builds amortization table with decreasing balance', () => {
    const sampleLoan: Loan = {
      id: 'L1',
      type: 'Personal Loan',
      lender: 'HDFC',
      outstanding: 50000,
      rate: 15,
      tenure: 6,
      emi: calculateEmi(50000, 15, 6),
    };
    const table = buildAmortizationTable(sampleLoan);
    assert.equal(table.length, 6);
    assert.equal(table[0].month, 1);
    assert.ok(table[0].balance < 50000);
    assert.equal(table[5].balance, 0);
  });

  it('aggregates multiple loans correctly', () => {
    const loans: Loan[] = [
      { id: '1', type: 'Personal', lender: 'A', outstanding: 100000, rate: 12, tenure: 12, emi: 8885 },
      { id: '2', type: 'Credit Card', lender: 'B', outstanding: 50000, rate: 24, tenure: 6, emi: 8930 },
    ];
    const agg = aggregateLoans(loans);
    assert.equal(agg.totalOutstanding, 150000);
    assert.equal(agg.totalEmi, 17815);
    assert.equal(agg.activeLoans, 2);
    // Blended rate = (100000*12 + 50000*24) / 150000 = 16%
    assert.equal(agg.blendedRate, 16);
  });
});
