import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  autoCategorize,
  computeIdempotencyHash,
  createTransaction,
  getTransactions,
  getTransactionSummary,
  updateTransactionCategory,
} from '../src/services/transactionService';

describe('Transaction Engine & Idempotency Suite', () => {
  it('correctly auto-categorizes various transaction types', () => {
    const salary = autoCategorize('NEFT CR - TECHSOLUTIONS PVT LTD - SALARY', 'CREDIT');
    assert.equal(salary.category, 'SALARY');
    assert.equal(salary.isRecurring, true);

    const loanEmi = autoCategorize('ACH DEBIT - HDFC BANK PERSONAL LOAN EMI', 'DEBIT');
    assert.equal(loanEmi.category, 'LOAN_REPAYMENT');
    assert.equal(loanEmi.recurringObligationType, 'EMI');

    const grocery = autoCategorize('UPI - BLINKIT COMMERCE INSTANT DELIVERY', 'DEBIT');
    assert.equal(grocery.category, 'GROCERIES');

    const bill = autoCategorize('BBPS DEBIT - BESCOM ELECTRICITY BILL', 'DEBIT');
    assert.equal(bill.category, 'BILLS');

    const sub = autoCategorize('AUTO RECURRING - NETFLIX ENTERTAINMENT SERVICES', 'DEBIT');
    assert.equal(sub.category, 'ENTERTAINMENT');
    assert.equal(sub.recurringObligationType, 'SUBSCRIPTION');
  });

  it('computes stable and deterministic idempotency hashes', () => {
    const hash1 = computeIdempotencyHash({
      userId: 'TEST_USER_1',
      accountId: 'ACC_1',
      type: 'DEBIT',
      amount: 1500,
      transactionDate: '2026-10-09T10:00:00Z',
      description: 'UPI - Swiggy Order',
    });

    const hash2 = computeIdempotencyHash({
      userId: 'TEST_USER_1',
      accountId: 'ACC_1',
      type: 'DEBIT',
      amount: 1500,
      transactionDate: '2026-10-09T10:00:00Z',
      description: '  UPI - Swiggy Order  ',
    });

    assert.equal(hash1, hash2, 'Idempotency hashes should match despite whitespace');
  });

  it('prevents duplicate transactions using idempotency check', async () => {
    const userId = 'IDEMP_USER_' + Date.now();
    const txInput = {
      type: 'DEBIT' as const,
      amount: 2500,
      description: 'Amazon Retail Purchase',
      transactionDate: '2026-10-01T12:00:00Z',
      providerTxId: 'TXN_IDEMP_TEST_01',
    };

    const first = await createTransaction(userId, txInput);
    assert.equal(first.isDuplicate, false);
    assert.ok(first.transaction.id);

    // Attempt inserting the exact same transaction again
    const second = await createTransaction(userId, txInput);
    assert.equal(second.isDuplicate, true);
    assert.equal(second.transaction.id, first.transaction.id);
  });

  it('calculates accurate summaries and net cashflow', async () => {
    const userId = 'SUM_USER_' + Date.now();
    await createTransaction(userId, {
      type: 'CREDIT',
      amount: 50000,
      description: 'Salary Credit',
      transactionDate: '2026-10-01T10:00:00Z',
    });
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 12000,
      description: 'Rent Payment',
      transactionDate: '2026-10-02T10:00:00Z',
    });
    await createTransaction(userId, {
      type: 'DEBIT',
      amount: 8000,
      description: 'HDFC EMI',
      transactionDate: '2026-10-03T10:00:00Z',
    });

    const summary = await getTransactionSummary(userId);
    assert.equal(summary.totalCredits, 50000);
    assert.equal(summary.totalDebits, 20000);
    assert.equal(summary.netCashFlow, 30000);
    assert.equal(summary.categoryBreakdown.BILLS, 12000);
    assert.equal(summary.categoryBreakdown.LOAN_REPAYMENT, 8000);
  });

  it('allows user correction and confirmation of category', async () => {
    const userId = 'CORR_USER_' + Date.now();
    const created = await createTransaction(userId, {
      type: 'DEBIT',
      amount: 999,
      description: 'Uncategorized payment',
      transactionDate: '2026-10-05T10:00:00Z',
    });

    assert.equal(created.transaction.isUserConfirmedCategory, false);

    const updated = await updateTransactionCategory(userId, created.transaction.id, 'MEDICAL');
    assert.ok(updated);
    assert.equal(updated.category, 'MEDICAL');
    assert.equal(updated.isUserConfirmedCategory, true);
  });
});
