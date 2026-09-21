export interface User {
  user_id: string;
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