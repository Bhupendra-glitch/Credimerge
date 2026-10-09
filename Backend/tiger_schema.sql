-- ============================================================================
-- CrediMerge: Tiger Data / TimescaleDB Schema for Financial Time-Series
-- ============================================================================
-- Purpose: High-volume, time-series financial transactions, income/expense history,
--          cash flow aggregation, and balance tracking.
-- Note: Supabase continues to manage users, loans, lenders, and relational data.
-- ============================================================================

-- 1. Ensure TimescaleDB extension is active
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Create the financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    transaction_id TEXT,
    transaction_type TEXT NOT NULL,          -- 'CREDIT' | 'DEBIT' | 'TRANSFER'
    category TEXT,                          -- 'SALARY', 'GROCERIES', 'BILLS', etc.
    amount NUMERIC(15, 2) NOT NULL,
    balance NUMERIC(15, 2),
    description TEXT,
    source TEXT DEFAULT 'MANUAL',           -- 'LIVE', 'SANDBOX', 'IMPORTED', 'MANUAL'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Convert into TimescaleDB Hypertable partitioned by time
-- (if_not_exists => TRUE ensures idempotency)
SELECT create_hypertable(
    'financial_transactions',
    'time',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 4. Create high-performance compound indexes for time-series analytics
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_time 
    ON financial_transactions (user_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
    ON financial_transactions (user_id, transaction_type, time DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_category 
    ON financial_transactions (user_id, category, time DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_transactions_unique_tx
    ON financial_transactions (user_id, transaction_id, time);
