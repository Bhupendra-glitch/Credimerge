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

-- 5. Create sandbox_verification_events table for verification audit trail & risk signals
CREATE TABLE IF NOT EXISTS sandbox_verification_events (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    verification_type TEXT NOT NULL,       -- 'PAN' | 'GST' | 'BANK_ACCOUNT'
    status TEXT NOT NULL,                  -- 'VERIFIED' | 'FAILED'
    reference_id TEXT,
    masked_identifier TEXT,
    name_matched BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'SANDBOX_TEST',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Convert into TimescaleDB Hypertable partitioned by time
SELECT create_hypertable(
    'sandbox_verification_events',
    'time',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 7. High-performance time-series indexes for verification streams
CREATE INDEX IF NOT EXISTS idx_sandbox_verification_user_time 
    ON sandbox_verification_events (user_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_sandbox_verification_type_status 
    ON sandbox_verification_events (user_id, verification_type, status, time DESC);

