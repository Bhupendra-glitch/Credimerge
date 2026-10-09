export interface User {
  user_id: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  profilePhoto?: string | null;
  createdAt?: unknown;
  emailVerified?: boolean;
  authProvider?: string;
  age: number;
  worker_type: string;
  monthly_income: number;
  income_stability_score: number;
  monthly_expenses: number;
  monthly_savings: number;
  existing_debt: number;
  monthly_emi: number;
  credit_card_balance: number;
  bnpl_balance: number;
  vehicle_loan_outstanding: number;
  active_loan_count: number;
  repayment_rate: number;
  missed_payments_12m: number;
  foir_pct: number;
  monthly_cashflow: number;
  cashflow_score: number;
  risk_band: string;
  forecast_30d_cashflow: number;
  forecast_60d_cashflow: number;
  forecast_90d_cashflow: number;
}

export interface Loan {
  id: string;
  type: string;
  lender: string;
  outstanding: number;
  rate: number;
  tenure: number;
  emi: number;
}

export type TransactionType = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'REVERSED' | 'FAILED';
export type TransactionSource = 'LIVE' | 'SANDBOX' | 'IMPORTED' | 'MANUAL';
export type TransactionCategory =
  | 'SALARY'
  | 'GROCERIES'
  | 'SHOPPING'
  | 'BILLS'
  | 'LOAN_REPAYMENT'
  | 'TRANSFER'
  | 'INVESTMENT'
  | 'MEDICAL'
  | 'ENTERTAINMENT'
  | 'OTHER';

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string | null;
  providerTxId?: string | null;
  idempotencyHash: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  categoryConfidence: number;
  isUserConfirmedCategory: boolean;
  description: string;
  merchantName?: string | null;
  transactionDate: string;
  status: TransactionStatus;
  source: TransactionSource;
  referenceNumber?: string | null;
  isRecurring?: boolean;
  recurringObligationType?: 'EMI' | 'SUBSCRIPTION' | 'RENT' | 'UTILITY' | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedAccount {
  id: string;
  userId: string;
  consentId?: string | null;
  institutionName: string;
  accountNumberMask: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD' | 'LOAN';
  provider: 'ACCOUNT_AGGREGATOR' | 'SETU' | 'SANDBOX' | 'MANUAL';
  connectionStatus: 'CONNECTED' | 'SYNCING' | 'DISCONNECTED' | 'CONSENT_EXPIRED';
  balance: number;
  currency: string;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountConsent {
  id: string;
  userId: string;
  provider: 'ACCOUNT_AGGREGATOR_SAHAMATI' | 'SETU_AA' | 'SANDBOX_AA';
  handle: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scopes: string[];
  dataFrequency: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netCashFlow: number;
  monthlySpending: number;
  categoryBreakdown: Record<TransactionCategory, number>;
  monthlyTrends: Array<{
    month: string;
    credits: number;
    debits: number;
    net: number;
  }>;
  recentTransactions: Transaction[];
  upcomingObligations: Array<{
    type: string;
    description: string;
    estimatedAmount: number;
    frequency: string;
    nextExpectedDate?: string;
  }>;
  cached?: boolean;
}

export interface InferredObligation {
  id: string;
  lenderOrMerchant: string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Weekly';
  confidence: number;
  status: 'INFERRED' | 'USER_CONFIRMED';
  sourceTransactionIds: string[];
  lastObservedDate: string;
  type: 'EMI' | 'SUBSCRIPTION' | 'RENT' | 'UTILITY';
  isPotentialDuplicate?: boolean;
  notes?: string;
}

export interface TransactionAdvisorInsights {
  verifiedMonthlyIncome: {
    amount: number;
    confidence: number;
    basis: string;
    isVerified: boolean;
  };
  verifiedMonthlyExpenses: {
    amount: number;
    basis: string;
  };
  inferredLoanRepayments: InferredObligation[];
  inferredSubscriptions: InferredObligation[];
  unusualSpendingAlerts: Array<{
    transactionId: string;
    description: string;
    amount: number;
    reason: string;
    date: string;
  }>;
  consolidationImpact: {
    existingTotalMonthlyEmi: number;
    inferredTotalMonthlyEmi: number;
    discrepancyAmount: number;
    verifiedCashflowSurplus: number;
    adjustedFoirPct: number;
    advisoryRecommendation: string;
    disclaimer: string;
  };
}

export interface TEEAttestationReport {
  enclaveId: string;
  enclaveMode: 'HARDWARE_CONFIDENTIAL_VM' | 'LOCAL_ENCLAVE_SIMULATOR';
  platform: 'INTEL_SGX' | 'AMD_SEV_SNP' | 'AWS_NITRO' | 'LOCAL_DEV_ENCLAVE';
  mrenclave: string;
  mrsigner: string;
  svn: number;
  nonce: string;
  timestamp: string;
  signature: string;
  publicKeyPem: string;
}

export interface ConfidentialRiskResult {
  tokenizedProfileId: string;
  verifiedMonthlyIncome: number;
  verifiedMonthlyDebits: number;
  calculatedCashflowSurplus: number;
  debtStressIndex: number;
  consolidatedAffordabilityCap: number;
  recommendedConsolidationTenureMonths: number;
  isConsolidationEconomicallyViable: boolean;
  estimatedInterestSavings: number;
  attestationVerificationProof: string;
  executionTimestamp: string;
}

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

export interface TigerHealthStatus {
  success: boolean;
  service: string;
  database: 'connected' | 'disconnected';
}