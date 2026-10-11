import { User } from '../types';

export interface DemoUserEntry {
  password: string;
  user: User;
  tagline: string;
  avatar: string;
  city: string;
}

export const demoUsers: Record<string, DemoUserEntry> = {
  GIG1001: {
    password: 'GIG1001@123',
    tagline: 'Ride-Hailing Driver · Bangalore',
    avatar: '🚗',
    city: 'Bengaluru',
    user: {
      user_id: 'GIG1001',
      userId: 'GIG1001',
      fullName: 'Vikram Singh (Demo)',
      age: 47,
      worker_type: 'Driver',
      monthly_income: 47600,
      income_stability_score: 0.697,
      monthly_expenses: 28500,
      monthly_savings: 13400,
      existing_debt: 31400,
      monthly_emi: 2500,
      credit_card_balance: 19300,
      bnpl_balance: 6700,
      vehicle_loan_outstanding: 0,
      active_loan_count: 0,
      repayment_rate: 0.791,
      missed_payments_12m: 0,
      foir_pct: 5.25,
      monthly_cashflow: 16600,
      cashflow_score: 62.2,
      risk_band: 'Low Risk',
      forecast_30d_cashflow: 14940,
      forecast_60d_cashflow: 15459.98,
      forecast_90d_cashflow: 14904.94,
    },
  },
  GIG1002: {
    password: 'GIG1002@123',
    tagline: 'Micro-Merchant / Retail Vendor · Pune',
    avatar: '🛒',
    city: 'Pune',
    user: {
      user_id: 'GIG1002',
      userId: 'GIG1002',
      fullName: 'Anita Roy (Demo)',
      age: 33,
      worker_type: 'Micro-Merchant',
      monthly_income: 40600,
      income_stability_score: 0.41,
      monthly_expenses: 26400,
      monthly_savings: 16000,
      existing_debt: 100300,
      monthly_emi: 3100,
      credit_card_balance: 13400,
      bnpl_balance: 4600,
      vehicle_loan_outstanding: 0,
      active_loan_count: 1,
      repayment_rate: 1,
      missed_payments_12m: 1,
      foir_pct: 7.64,
      monthly_cashflow: 11100,
      cashflow_score: 50.7,
      risk_band: 'Moderate Risk',
      forecast_30d_cashflow: 9990,
      forecast_60d_cashflow: 10329.62,
      forecast_90d_cashflow: 10804.17,
    },
  },
};
