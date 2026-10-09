import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTransaction } from '../src/services/transactionService';
import { analyzeTransactionInsights } from '../src/services/transactionAdvisorService';

describe('Transaction Advisor & Obligation Intelligence Suite', () => {
  it('identifies verified income and recurring loan repayments from transaction history', async () => {
    const userId = 'ADV_USER_' + Date.now();

    // Add recurring salary credits
    await createTransaction(userId, {
      type: 'CREDIT',
      amount: 60000,
      description: 'NEFT CR - TECHSOLUTIONS - SALARY',
      category: 'SALARY',
      transactionDate: '2026-08-30T10:00:00Z',
    });
    await createTransaction(userId, {
      type: 'CREDIT',
      amount: 60000,
      description: 'NEFT CR - TECHSOLUTIONS - SALARY',
      category: 'SALARY',
      transactionDate: '2026-09-30T10:00:00Z',
    });

    // Add loan debits
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 8500,
      description: 'ACH DEBIT - HDFC BANK PERSONAL LOAN EMI',
      merchantName: 'HDFC Bank',
      category: 'LOAN_REPAYMENT',
      transactionDate: '2026-09-05T10:00:00Z',
    });
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 3200,
      description: 'AUTO DEBIT - BAJAJ FINSERV EMI',
      merchantName: 'Bajaj Finserv',
      category: 'LOAN_REPAYMENT',
      transactionDate: '2026-09-10T10:00:00Z',
    });

    // Add regular expenses
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 15000,
      description: 'Rent and Groceries',
      category: 'BILLS',
      transactionDate: '2026-09-15T10:00:00Z',
    });

    const insights = await analyzeTransactionInsights(userId);

    // Verified income checks
    assert.equal(insights.verifiedMonthlyIncome.amount, 60000);
    assert.equal(insights.verifiedMonthlyIncome.isVerified, true);
    assert.ok(insights.verifiedMonthlyIncome.confidence >= 0.9);

    // Inferred obligations checks
    assert.ok(insights.inferredLoanRepayments.length >= 2);
    const lenders = insights.inferredLoanRepayments.map((o) => o.lenderOrMerchant);
    assert.ok(lenders.includes('HDFC Bank'));
    assert.ok(lenders.includes('Bajaj Finserv'));

    // Consolidation impact checks
    assert.equal(insights.consolidationImpact.inferredTotalMonthlyEmi, 11700);
    assert.ok(insights.consolidationImpact.adjustedFoirPct > 0);
    assert.ok(insights.consolidationImpact.disclaimer.includes('not an offer or guarantee'));
  });

  it('flags potential duplicate loan repayments within 15 days', async () => {
    const userId = 'DUP_ADV_USER_' + Date.now();

    // Two identical loan debits 5 days apart
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 7500,
      description: 'ACH DEBIT - TATA CAPITAL EMI',
      merchantName: 'Tata Capital',
      category: 'LOAN_REPAYMENT',
      transactionDate: '2026-10-01T10:00:00Z',
      providerTxId: 'DUP_TX_1',
    });
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 7500,
      description: 'ACH DEBIT - TATA CAPITAL EMI',
      merchantName: 'Tata Capital',
      category: 'LOAN_REPAYMENT',
      transactionDate: '2026-10-06T10:00:00Z',
      providerTxId: 'DUP_TX_2',
    });

    const insights = await analyzeTransactionInsights(userId);
    assert.ok(insights.unusualSpendingAlerts.length > 0);
    const alert = insights.unusualSpendingAlerts.find((a) => a.reason.includes('duplicate'));
    assert.ok(alert, 'Should trigger duplicate loan repayment alert');
  });
});
