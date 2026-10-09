import crypto from 'crypto';
import { queryTiger, isTigerConfigured, testTigerConnection } from '../config/tigerData';

export interface FinancialTransaction {
  time: string;
  user_id: string;
  transaction_id: string;
  transaction_type: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  category: string;
  amount: number;
  balance?: number | null;
  description: string;
  source: string;
  created_at: string;
}

export interface FinancialTransactionInput {
  userId: string;
  transactionId?: string;
  time?: string | Date;
  transactionType: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  category?: string;
  amount: number;
  balance?: number | null;
  description?: string;
  source?: string;
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount?: number;
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
  time: string;
}

export interface ForecastProjection {
  days: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNetSavings: number;
  dailyRunRate: number;
  confidenceScore: number;
}

export interface FinancialForecast {
  days30: ForecastProjection;
  days60: ForecastProjection;
  days90: ForecastProjection;
  historicalDaysAnalyzed: number;
  averageDailyIncome: number;
  averageDailyExpenses: number;
  incomeVolatilityPercent: number;
  riskBand: 'LOW' | 'MODERATE' | 'HIGH';
}

// In-memory fallback cache when Tiger Data connection is offline or in development
const memoryTransactions: FinancialTransaction[] = [];

/**
 * Inserts a financial transaction into Tiger Data (TimescaleDB) using parameterized queries.
 */
export async function insertFinancialTransaction(
  input: FinancialTransactionInput
): Promise<FinancialTransaction> {
  const transactionId = input.transactionId || `tx_${crypto.randomBytes(8).toString('hex')}`;
  const timestamp = input.time ? new Date(input.time).toISOString() : new Date().toISOString();
  const category = (input.category || 'OTHER').toUpperCase().trim();
  const description = (input.description || 'Transaction').trim();
  const source = (input.source || 'MANUAL').toUpperCase().trim();
  const type = input.transactionType.toUpperCase() as 'CREDIT' | 'DEBIT' | 'TRANSFER';
  const amount = Number(input.amount);
  const balance = input.balance !== undefined && input.balance !== null ? Number(input.balance) : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Transaction amount must be a positive number');
  }

  if (!['CREDIT', 'DEBIT', 'TRANSFER'].includes(type)) {
    throw new Error('Transaction type must be CREDIT, DEBIT, or TRANSFER');
  }

  const newTx: FinancialTransaction = {
    time: timestamp,
    user_id: input.userId,
    transaction_id: transactionId,
    transaction_type: type,
    category,
    amount,
    balance,
    description,
    source,
    created_at: new Date().toISOString(),
  };

  if (isTigerConfigured()) {
    try {
      const sql = `
        INSERT INTO financial_transactions (
          time, user_id, transaction_id, transaction_type, category, amount, balance, description, source, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )
        ON CONFLICT (user_id, transaction_id, time) DO UPDATE SET
          amount = EXCLUDED.amount,
          category = EXCLUDED.category,
          balance = EXCLUDED.balance,
          description = EXCLUDED.description
        RETURNING *;
      `;

      const rows = await queryTiger(sql, [
        timestamp,
        input.userId,
        transactionId,
        type,
        category,
        amount,
        balance,
        description,
        source,
      ]);

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          time: new Date(row.time).toISOString(),
          user_id: row.user_id,
          transaction_id: row.transaction_id,
          transaction_type: row.transaction_type,
          category: row.category,
          amount: Number(row.amount),
          balance: row.balance !== null ? Number(row.balance) : null,
          description: row.description,
          source: row.source,
          created_at: new Date(row.created_at).toISOString(),
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [Tiger Data] Fallback to in-memory store on insert error:', err.message);
    }
  }

  // Fallback to in-memory store
  memoryTransactions.unshift(newTx);
  return newTx;
}

/**
 * Retrieves transactions for a user from Tiger Data using parameterized queries and pagination.
 */
export async function getFinancialTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    transactionType?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ transactions: FinancialTransaction[]; totalCount: number }> {
  if (!userId) throw new Error('User ID is required');

  const limit = Math.min(Math.max(Number(options?.limit || 50), 1), 500);
  const offset = Math.max(Number(options?.offset || 0), 0);

  if (isTigerConfigured()) {
    try {
      const conditions: string[] = ['user_id = $1'];
      const params: any[] = [userId];

      if (options?.transactionType && options.transactionType !== 'ALL') {
        params.push(options.transactionType.toUpperCase());
        conditions.push(`transaction_type = $${params.length}`);
      }

      if (options?.category && options.category !== 'ALL') {
        params.push(options.category.toUpperCase());
        conditions.push(`category = $${params.length}`);
      }

      if (options?.startDate) {
        params.push(new Date(options.startDate).toISOString());
        conditions.push(`time >= $${params.length}`);
      }

      if (options?.endDate) {
        params.push(new Date(options.endDate).toISOString());
        conditions.push(`time <= $${params.length}`);
      }

      const whereClause = conditions.join(' AND ');

      // Total count query
      const countSql = `SELECT COUNT(*) as count FROM financial_transactions WHERE ${whereClause};`;
      const countRows = await queryTiger(countSql, params);
      const totalCount = Number(countRows[0]?.count || 0);

      // Fetch paginated transactions
      params.push(limit);
      const limitParamIdx = params.length;
      params.push(offset);
      const offsetParamIdx = params.length;

      const sql = `
        SELECT time, user_id, transaction_id, transaction_type, category, amount, balance, description, source, created_at
        FROM financial_transactions
        WHERE ${whereClause}
        ORDER BY time DESC
        LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx};
      `;

      const rows = await queryTiger(sql, params);
      const transactions = rows.map((row) => ({
        time: new Date(row.time).toISOString(),
        user_id: row.user_id,
        transaction_id: row.transaction_id,
        transaction_type: row.transaction_type,
        category: row.category,
        amount: Number(row.amount),
        balance: row.balance !== null ? Number(row.balance) : null,
        description: row.description,
        source: row.source,
        created_at: new Date(row.created_at).toISOString(),
      }));

      return { transactions, totalCount };
    } catch (err: any) {
      console.warn('⚠️ [Tiger Data] Fallback to in-memory store on get transactions:', err.message);
    }
  }

  // In-memory fallback
  const filtered = memoryTransactions.filter((tx) => tx.user_id === userId);
  return {
    transactions: filtered.slice(offset, offset + limit),
    totalCount: filtered.length,
  };
}

/**
 * Calculates aggregated cash flow time-series using TimescaleDB time_bucket
 */
export async function getCashFlow(
  userId: string,
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<CashFlowPoint[]> {
  if (!userId) throw new Error('User ID is required');

  const bucketInterval = interval === 'month' ? '1 month' : interval === 'week' ? '1 week' : '1 day';

  if (isTigerConfigured()) {
    try {
      const sql = `
        SELECT 
          time_bucket('${bucketInterval}', time) AS bucket_time,
          COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END), 0) AS net_cash_flow,
          COUNT(*) as tx_count
        FROM financial_transactions
        WHERE user_id = $1
        GROUP BY bucket_time
        ORDER BY bucket_time ASC;
      `;

      const rows = await queryTiger(sql, [userId]);
      return rows.map((r) => ({
        date: new Date(r.bucket_time).toISOString().split('T')[0],
        income: Number(r.income),
        expenses: Number(r.expenses),
        netCashFlow: Number(r.net_cash_flow),
        transactionCount: Number(r.tx_count),
      }));
    } catch (err: any) {
      console.warn('⚠️ [Tiger Data] Fallback on getCashFlow:', err.message);
    }
  }

  // In-memory fallback
  const userTxs = memoryTransactions.filter((tx) => tx.user_id === userId);
  const grouped: Record<string, { income: number; expenses: number; count: number }> = {};
  for (const tx of userTxs) {
    const d = tx.time.split('T')[0];
    if (!grouped[d]) grouped[d] = { income: 0, expenses: 0, count: 0 };
    if (tx.transaction_type === 'CREDIT') grouped[d].income += tx.amount;
    if (tx.transaction_type === 'DEBIT') grouped[d].expenses += tx.amount;
    grouped[d].count += 1;
  }

  return Object.keys(grouped).sort().map((date) => ({
    date,
    income: grouped[date].income,
    expenses: grouped[date].expenses,
    netCashFlow: grouped[date].income - grouped[date].expenses,
    transactionCount: grouped[date].count,
  }));
}

/**
 * Retrieves income history time-series for a user
 */
export async function getIncomeHistory(userId: string): Promise<FinancialTransaction[]> {
  const result = await getFinancialTransactions(userId, { transactionType: 'CREDIT', limit: 100 });
  return result.transactions;
}

/**
 * Retrieves expense history time-series for a user
 */
export async function getExpenseHistory(userId: string): Promise<FinancialTransaction[]> {
  const result = await getFinancialTransactions(userId, { transactionType: 'DEBIT', limit: 100 });
  return result.transactions;
}

/**
 * Retrieves balance trend history from Tiger Data
 */
export async function getBalanceHistory(userId: string): Promise<BalanceHistoryPoint[]> {
  if (!userId) throw new Error('User ID is required');

  if (isTigerConfigured()) {
    try {
      const sql = `
        SELECT 
          time_bucket('1 day', time) AS bucket_time,
          (ARRAY_AGG(balance ORDER BY time DESC))[1] AS balance,
          MAX(time) as latest_time
        FROM financial_transactions
        WHERE user_id = $1 AND balance IS NOT NULL
        GROUP BY bucket_time
        ORDER BY bucket_time ASC;
      `;

      const rows = await queryTiger(sql, [userId]);
      return rows.map((r) => ({
        date: new Date(r.bucket_time).toISOString().split('T')[0],
        balance: Number(r.balance),
        time: new Date(r.latest_time).toISOString(),
      }));
    } catch (err: any) {
      console.warn('⚠️ [Tiger Data] Fallback on getBalanceHistory:', err.message);
    }
  }

  return [];
}

/**
 * Computes 30/60/90-day time-series forecasting, volatility and risk band
 * based on Tiger Data historical cash flow velocity.
 */
export async function getForecastingData(userId: string): Promise<FinancialForecast> {
  const cashFlow = await getCashFlow(userId, 'day');

  if (cashFlow.length === 0) {
    return {
      days30: { days: 30, projectedIncome: 0, projectedExpenses: 0, projectedNetSavings: 0, dailyRunRate: 0, confidenceScore: 0.5 },
      days60: { days: 60, projectedIncome: 0, projectedExpenses: 0, projectedNetSavings: 0, dailyRunRate: 0, confidenceScore: 0.5 },
      days90: { days: 90, projectedIncome: 0, projectedExpenses: 0, projectedNetSavings: 0, dailyRunRate: 0, confidenceScore: 0.5 },
      historicalDaysAnalyzed: 0,
      averageDailyIncome: 0,
      averageDailyExpenses: 0,
      incomeVolatilityPercent: 0,
      riskBand: 'MODERATE',
    };
  }

  const daysCount = cashFlow.length;
  const totalIncome = cashFlow.reduce((acc, p) => acc + p.income, 0);
  const totalExpenses = cashFlow.reduce((acc, p) => acc + p.expenses, 0);

  const avgDailyIncome = totalIncome / daysCount;
  const avgDailyExpenses = totalExpenses / daysCount;
  const dailyRunRate = avgDailyIncome - avgDailyExpenses;

  // Income volatility (standard deviation / mean)
  const incomeVariance = cashFlow.reduce((acc, p) => acc + Math.pow(p.income - avgDailyIncome, 2), 0) / daysCount;
  const incomeStdDev = Math.sqrt(incomeVariance);
  const incomeVolatilityPercent = avgDailyIncome > 0 ? (incomeStdDev / avgDailyIncome) * 100 : 0;

  // Risk band determination
  let riskBand: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
  if (dailyRunRate < 0 || incomeVolatilityPercent > 45) {
    riskBand = 'HIGH';
  } else if (incomeVolatilityPercent > 25 || avgDailyExpenses / Math.max(avgDailyIncome, 1) > 0.75) {
    riskBand = 'MODERATE';
  }

  const project = (days: number): ForecastProjection => {
    // Dampened projection model with confidence decay over forecast horizon
    const decayFactor = days === 30 ? 1.0 : days === 60 ? 0.95 : 0.9;
    const projectedIncome = +(avgDailyIncome * days * decayFactor).toFixed(2);
    const projectedExpenses = +(avgDailyExpenses * days).toFixed(2);
    const projectedNetSavings = +(projectedIncome - projectedExpenses).toFixed(2);
    const confidenceScore = +(Math.max(0.6, 0.95 - (days / 365) - (incomeVolatilityPercent / 200))).toFixed(2);

    return {
      days,
      projectedIncome,
      projectedExpenses,
      projectedNetSavings,
      dailyRunRate: +dailyRunRate.toFixed(2),
      confidenceScore,
    };
  };

  return {
    days30: project(30),
    days60: project(60),
    days90: project(90),
    historicalDaysAnalyzed: daysCount,
    averageDailyIncome: +avgDailyIncome.toFixed(2),
    averageDailyExpenses: +avgDailyExpenses.toFixed(2),
    incomeVolatilityPercent: +incomeVolatilityPercent.toFixed(1),
    riskBand,
  };
}
