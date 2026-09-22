import fs from 'fs';
import path from 'path';

export interface UserRecord {
  user_id: string;
  password: string;
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
  emergency_expense: number;
  income_drop_scenario_pct: number;
  cashflow_score: number;
  risk_band: string;
  forecast_30d_cashflow: number;
  forecast_60d_cashflow: number;
  forecast_90d_cashflow: number;
  new_loan_amount: number;
  new_loan_interest_pct: number;
  new_loan_emi_24m: number;
  stress_cashflow_after_new_loan: number;
  stress_foir_pct: number;
}

let usersCache: UserRecord[] = [];

function resolveUsersCsvPath(): string {
  const candidates = [
    path.resolve(__dirname, '..', 'data', 'users.csv'),
    path.resolve(__dirname, '..', '..', 'src', 'data', 'users.csv'),
    path.resolve(process.cwd(), 'src', 'data', 'users.csv'),
    path.resolve(process.cwd(), 'data', 'users.csv'),
  ];

  const existing = candidates.find(filePath => fs.existsSync(filePath));
  if (!existing) {
    throw new Error(`Could not find users.csv in any expected location: ${candidates.join('; ')}`);
  }

  return existing;
}

export function loadUsers(): UserRecord[] {
  if (usersCache.length > 0) return usersCache;

  const csvPath = resolveUsersCsvPath();
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  usersCache = lines.slice(1).map(line => {
    const values = line.split(',');
    const record: any = {};
    headers.forEach((h, i) => {
      const v = values[i]?.trim();
      record[h] = isNaN(Number(v)) || v === '' ? v : Number(v);
    });
    return record as UserRecord;
  });

  return usersCache;
}

export function findUser(userId: string): UserRecord | undefined {
  return loadUsers().find(u => u.user_id === userId);
}

export function getSafeUser(user: UserRecord) {
  const { password, ...safe } = user;
  return safe;
}