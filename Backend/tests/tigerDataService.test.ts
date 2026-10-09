import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTigerConfigured,
  testTigerConnection,
} from '../src/config/tigerData';
import {
  insertFinancialTransaction,
  getFinancialTransactions,
  getCashFlow,
  getIncomeHistory,
  getExpenseHistory,
  getForecastingData,
} from '../src/services/tigerDataService';

describe('Tiger Data / TimescaleDB Integration Tests', () => {
  test('Tiger Data environment configuration detection', () => {
    const configured = isTigerConfigured();
    assert.strictEqual(typeof configured, 'boolean');
    assert.strictEqual(configured, true, 'Tiger Data URL should be configured in test environment');
  });

  test('Tiger Cloud database connection health', async () => {
    const isConnected = await testTigerConnection();
    assert.strictEqual(isConnected, true, 'Should successfully ping live Tiger Cloud PostgreSQL / TimescaleDB');
  });

  test('Insert transaction validation - rejects negative or invalid inputs', async () => {
    await assert.rejects(
      async () => {
        await insertFinancialTransaction({
          userId: 'test_user_val',
          transactionType: 'CREDIT',
          amount: -500,
        });
      },
      /amount must be a positive number/i
    );

    await assert.rejects(
      async () => {
        await insertFinancialTransaction({
          userId: 'test_user_val',
          transactionType: 'INVALID_TYPE' as any,
          amount: 1000,
        });
      },
      /transaction type must be CREDIT, DEBIT, or TRANSFER/i
    );
  });

  test('Insert and query financial transactions with parameterized filters', async () => {
    const testUserId = `TEST_TIGER_${Date.now()}`;

    // 1. Insert Credit (Salary)
    const tx1 = await insertFinancialTransaction({
      userId: testUserId,
      transactionType: 'CREDIT',
      amount: 60000,
      category: 'SALARY',
      description: 'Monthly Salary Deposit',
      source: 'MANUAL',
    });
    assert.ok(tx1.transaction_id);
    assert.strictEqual(tx1.user_id, testUserId);
    assert.strictEqual(tx1.amount, 60000);
    assert.strictEqual(tx1.transaction_type, 'CREDIT');

    // 2. Insert Debit (Rent)
    const tx2 = await insertFinancialTransaction({
      userId: testUserId,
      transactionType: 'DEBIT',
      amount: 18000,
      category: 'BILLS',
      description: 'Monthly Apartment Rent',
      source: 'MANUAL',
    });
    assert.ok(tx2.transaction_id);
    assert.strictEqual(tx2.amount, 18000);

    // 3. Fetch all for user
    const list = await getFinancialTransactions(testUserId);
    assert.strictEqual(list.totalCount >= 2, true);

    // 4. Test type filter
    const creditsOnly = await getFinancialTransactions(testUserId, { transactionType: 'CREDIT' });
    assert.strictEqual(creditsOnly.transactions.every((t) => t.transaction_type === 'CREDIT'), true);

    // 5. Test income & expense history helpers
    const incomeHistory = await getIncomeHistory(testUserId);
    assert.strictEqual(incomeHistory.length >= 1, true);

    const expenseHistory = await getExpenseHistory(testUserId);
    assert.strictEqual(expenseHistory.length >= 1, true);
  });

  test('Calculate time_bucket cash flow and 30/60/90-day forecast projections', async () => {
    const testUserId = `TEST_FC_${Date.now()}`;

    // Seed credits and debits
    await insertFinancialTransaction({
      userId: testUserId,
      transactionType: 'CREDIT',
      amount: 50000,
      category: 'SALARY',
      description: 'Salary',
    });
    await insertFinancialTransaction({
      userId: testUserId,
      transactionType: 'DEBIT',
      amount: 15000,
      category: 'SHOPPING',
      description: 'Retail purchases',
    });

    const cashFlow = await getCashFlow(testUserId, 'day');
    assert.ok(Array.isArray(cashFlow));
    assert.strictEqual(cashFlow.length >= 1, true);
    assert.strictEqual(cashFlow[0].income, 50000);
    assert.strictEqual(cashFlow[0].expenses, 15000);
    assert.strictEqual(cashFlow[0].netCashFlow, 35000);

    const forecast = await getForecastingData(testUserId);
    assert.ok(forecast.days30);
    assert.ok(forecast.days60);
    assert.ok(forecast.days90);
    assert.strictEqual(forecast.days30.days, 30);
    assert.strictEqual(forecast.days60.days, 60);
    assert.strictEqual(forecast.days90.days, 90);
    assert.strictEqual(forecast.days30.projectedIncome > 0, true);
    assert.strictEqual(forecast.days30.projectedExpenses > 0, true);
    assert.strictEqual(forecast.days30.projectedNetSavings > 0, true);
    assert.strictEqual(['LOW', 'MODERATE', 'HIGH'].includes(forecast.riskBand), true);
  });
});
