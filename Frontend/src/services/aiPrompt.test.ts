import { describe, expect, it } from 'vitest';
import { buildFinancialPrompt } from './aiPrompt';

describe('buildFinancialPrompt', () => {
  it('includes the user financial snapshot and the question', () => {
    const prompt = buildFinancialPrompt(
      {
        user_id: 'GIG1001',
        monthly_income: 50000,
        monthly_emi: 15000,
        monthly_cashflow: 12000,
        existing_debt: 250000,
        cashflow_score: 72,
        risk_band: 'Low Risk',
      },
      'What is my safe EMI range?'
    );

    expect(prompt).toContain('GIG1001');
    expect(prompt).toContain('Monthly income: ₹50,000');
    expect(prompt).toContain('What is my safe EMI range?');
    expect(prompt).toContain('Financial guidance only');
  });
});
