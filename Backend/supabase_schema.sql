-- CrediMerge Supabase Schema
-- Run this script in your Supabase Dashboard:
-- Go to https://supabase.com/dashboard/project/jbroptavkwflxsupuidv/sql/new
-- Paste and click "Run".

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  user_id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  profile_photo TEXT,
  email_verified BOOLEAN DEFAULT false,
  auth_provider VARCHAR(50) DEFAULT 'local',
  age INTEGER,
  worker_type VARCHAR(100),
  monthly_income NUMERIC(12, 2) DEFAULT 0,
  income_stability_score NUMERIC(5, 3) DEFAULT 0,
  monthly_expenses NUMERIC(12, 2) DEFAULT 0,
  monthly_savings NUMERIC(12, 2) DEFAULT 0,
  existing_debt NUMERIC(12, 2) DEFAULT 0,
  monthly_emi NUMERIC(12, 2) DEFAULT 0,
  credit_card_balance NUMERIC(12, 2) DEFAULT 0,
  bnpl_balance NUMERIC(12, 2) DEFAULT 0,
  vehicle_loan_outstanding NUMERIC(12, 2) DEFAULT 0,
  active_loan_count INTEGER DEFAULT 0,
  repayment_rate NUMERIC(5, 3) DEFAULT 0,
  missed_payments_12m INTEGER DEFAULT 0,
  foir_pct NUMERIC(6, 2) DEFAULT 0,
  monthly_cashflow NUMERIC(12, 2) DEFAULT 0,
  emergency_expense NUMERIC(12, 2) DEFAULT 0,
  income_drop_scenario_pct NUMERIC(5, 2) DEFAULT 0,
  cashflow_score NUMERIC(5, 2) DEFAULT 0,
  risk_band VARCHAR(50) DEFAULT 'Low Risk',
  forecast_30d_cashflow NUMERIC(12, 2) DEFAULT 0,
  forecast_60d_cashflow NUMERIC(12, 2) DEFAULT 0,
  forecast_90d_cashflow NUMERIC(12, 2) DEFAULT 0,
  new_loan_amount NUMERIC(12, 2) DEFAULT 0,
  new_loan_interest_pct NUMERIC(5, 2) DEFAULT 0,
  new_loan_emi_24m NUMERIC(12, 2) DEFAULT 0,
  stress_cashflow_after_new_loan NUMERIC(12, 2) DEFAULT 0,
  stress_foir_pct NUMERIC(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Loans Table
CREATE TABLE IF NOT EXISTS public.loans (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  lender VARCHAR(100) NOT NULL,
  outstanding NUMERIC(12, 2) NOT NULL,
  rate NUMERIC(6, 2) NOT NULL,
  tenure INTEGER NOT NULL,
  emi NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);

-- 3. Credit Reports Table
CREATE TABLE IF NOT EXISTS public.credit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON public.credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_created_at ON public.credit_reports(created_at DESC);

-- 4. Verification Codes Table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. Account Consents Table (Consent-based Account Aggregator Framework)
CREATE TABLE IF NOT EXISTS public.account_consents (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'SANDBOX_AA',
  handle VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  scopes JSONB DEFAULT '["TRANSACTIONS", "PROFILE", "SUMMARY"]'::jsonb,
  data_frequency VARCHAR(50) DEFAULT 'DAILY',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_account_consents_user ON public.account_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_account_consents_status ON public.account_consents(status);

-- 7. Linked Accounts Table
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  consent_id TEXT REFERENCES public.account_consents(id) ON DELETE SET NULL,
  institution_name VARCHAR(150) NOT NULL,
  account_number_mask VARCHAR(50) NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'SAVINGS',
  provider VARCHAR(50) NOT NULL DEFAULT 'SANDBOX',
  connection_status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
  balance NUMERIC(12, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON public.linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_institution ON public.linked_accounts(institution_name);

-- 8. Real-time Transactions Table (with Idempotency & Deduplication)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  account_id TEXT REFERENCES public.linked_accounts(id) ON DELETE SET NULL,
  provider_tx_id TEXT,
  idempotency_hash VARCHAR(64) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  amount NUMERIC(12, 2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
  category_confidence NUMERIC(3, 2) DEFAULT 0.90,
  is_user_confirmed_category BOOLEAN DEFAULT false,
  description TEXT NOT NULL,
  merchant_name VARCHAR(150),
  transaction_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'REVERSED', 'FAILED')),
  source VARCHAR(20) NOT NULL DEFAULT 'SANDBOX' CHECK (source IN ('LIVE', 'SANDBOX', 'IMPORTED', 'MANUAL')),
  reference_number VARCHAR(100),
  is_recurring BOOLEAN DEFAULT false,
  recurring_obligation_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(idempotency_hash);

-- 9. TEE Computation & Audit Logs Table
CREATE TABLE IF NOT EXISTS public.tee_computation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  enclave_id VARCHAR(100) NOT NULL,
  computation_type VARCHAR(100) NOT NULL,
  attestation_verified BOOLEAN NOT NULL DEFAULT true,
  quote_hash TEXT NOT NULL,
  input_hash VARCHAR(64) NOT NULL,
  output_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tee_logs_user_id ON public.tee_computation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tee_logs_created_at ON public.tee_computation_logs(created_at DESC);

-- Row Level Security (RLS) Configuration
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tee_computation_logs ENABLE ROW LEVEL SECURITY;

-- Allow access policies
DROP POLICY IF EXISTS "Allow all access on users" ON public.users;
CREATE POLICY "Allow all access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on loans" ON public.loans;
CREATE POLICY "Allow all access on loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on credit_reports" ON public.credit_reports;
CREATE POLICY "Allow all access on credit_reports" ON public.credit_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on verification_codes" ON public.verification_codes;
CREATE POLICY "Allow all access on verification_codes" ON public.verification_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Allow all access on password_reset_tokens" ON public.password_reset_tokens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on account_consents" ON public.account_consents;
CREATE POLICY "Allow all access on account_consents" ON public.account_consents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on linked_accounts" ON public.linked_accounts;
CREATE POLICY "Allow all access on linked_accounts" ON public.linked_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on transactions" ON public.transactions;
CREATE POLICY "Allow all access on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on tee_computation_logs" ON public.tee_computation_logs;
CREATE POLICY "Allow all access on tee_computation_logs" ON public.tee_computation_logs FOR ALL USING (true) WITH CHECK (true);
