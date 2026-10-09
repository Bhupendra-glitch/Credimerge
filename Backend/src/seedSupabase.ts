import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSupabase, isSupabaseConfigured } from './config/supabase';
import { getDemoLoans } from './services/supabaseService';

dotenv.config();

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headerLine = lines.shift();
  if (!headerLine) return [];

  const headers = headerLine.split(',').map((h) => h.trim());

  return lines.map((line) => {
    const values = line.split(',');
    const row: Record<string, any> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() ?? '';
      row[header] =
        value !== '' && !Number.isNaN(Number(value))
          ? Number(value)
          : value;
    });

    return row;
  });
}

const workerNames: Record<string, string> = {
  GIG1001: 'Aarav Patel (Driver)',
  GIG1002: 'Priya Sharma (Micro-Merchant)',
  GIG1003: 'Rohan Verma (Delivery Partner)',
  GIG1004: 'Vikram Singh (Gig Worker)',
  GIG1005: 'Sunil Kumar (Driver)',
  GIG1006: 'Meera Iyer (Micro-Merchant)',
  GIG1007: 'Deepak Joshi (Delivery Partner)',
  GIG1008: 'Ananya Rao (Delivery Partner)',
  GIG1009: 'Karan Malhotra (Delivery Partner)',
  GIG1010: 'Neha Gupta (Gig Worker)',
};

async function main() {
  console.log('🔄 Starting CrediMerge Supabase Seeding...');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured yet in Backend/.env');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are set.');
    process.exit(1);
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client.');
    process.exit(1);
  }

  const candidates = [
    process.env.SEED_CSV ? path.resolve(process.env.SEED_CSV) : '',
    path.resolve(process.cwd(), 'GigCred_synthetic_10_users.csv'),
    path.resolve(process.cwd(), '..', 'GigCred_synthetic_10_users.csv'),
    path.resolve(__dirname, 'data', 'users.csv'),
  ];
  const csvPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!csvPath) {
    throw new Error(`Seed CSV not found. Checked: ${candidates.join('; ')}`);
  }

  console.log(`📄 Reading data from: ${csvPath}`);
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

  if (!rows.length) {
    throw new Error('No users found in seed CSV');
  }

  let userCount = 0;
  let loanCount = 0;

  for (const row of rows) {
    const userId = String(row.user_id || '').trim().toUpperCase();
    const rawPassword = String(row.password || `${userId}@123`);

    if (!userId) continue;

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const email = `${userId.toLowerCase()}@credimerge.com`;
    const fullName = workerNames[userId] || `${userId} (${row.worker_type || 'Worker'})`;

    const userPayload = {
      user_id: userId,
      email,
      full_name: fullName,
      password_hash: passwordHash,
      email_verified: true,
      auth_provider: 'local',
      age: Number(row.age || 30),
      worker_type: String(row.worker_type || 'Gig Worker'),
      monthly_income: Number(row.monthly_income || 0),
      income_stability_score: Number(row.income_stability_score || 0),
      monthly_expenses: Number(row.monthly_expenses || 0),
      monthly_savings: Number(row.monthly_savings || 0),
      existing_debt: Number(row.existing_debt || 0),
      monthly_emi: Number(row.monthly_emi || 0),
      credit_card_balance: Number(row.credit_card_balance || 0),
      bnpl_balance: Number(row.bnpl_balance || 0),
      vehicle_loan_outstanding: Number(row.vehicle_loan_outstanding || 0),
      active_loan_count: Number(row.active_loan_count || 0),
      repayment_rate: Number(row.repayment_rate || 0),
      missed_payments_12m: Number(row.missed_payments_12m || 0),
      foir_pct: Number(row.foir_pct || 0),
      monthly_cashflow: Number(row.monthly_cashflow || 0),
      emergency_expense: Number(row.emergency_expense || 0),
      income_drop_scenario_pct: Number(row.income_drop_scenario_pct || 0),
      cashflow_score: Number(row.cashflow_score || 0),
      risk_band: String(row.risk_band || 'Low Risk'),
      forecast_30d_cashflow: Number(row.forecast_30d_cashflow || 0),
      forecast_60d_cashflow: Number(row.forecast_60d_cashflow || 0),
      forecast_90d_cashflow: Number(row.forecast_90d_cashflow || 0),
      new_loan_amount: Number(row.new_loan_amount || 0),
      new_loan_interest_pct: Number(row.new_loan_interest_pct || 0),
      new_loan_emi_24m: Number(row.new_loan_emi_24m || 0),
      stress_cashflow_after_new_loan: Number(row.stress_cashflow_after_new_loan || 0),
      stress_foir_pct: Number(row.stress_foir_pct || 0),
      updated_at: new Date().toISOString(),
    };

    const { error: userError } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'user_id' });

    if (userError) {
      console.error(`❌ Failed to seed user ${userId}:`, userError.message);
      continue;
    }

    userCount++;
    console.log(`✅ Seeded user: ${userId} (${email})`);

    // Seed initial categorized loans for this user
    const loans = getDemoLoans(userId);
    for (const loan of loans) {
      const loanPayload = {
        id: loan.id,
        user_id: userId,
        type: loan.type,
        lender: loan.lender,
        outstanding: loan.outstanding,
        rate: loan.rate,
        tenure: loan.tenure,
        emi: loan.emi,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: loanError } = await supabase
        .from('loans')
        .upsert(loanPayload, { onConflict: 'id' });

      if (!loanError) {
        loanCount++;
      } else {
        console.warn(`  ⚠️ Loan error for ${loan.id}:`, loanError.message);
      }
    }
  }

  console.log(`\n🎉 Seeding finished successfully!`);
  console.log(`📊 Total users seeded to Supabase: ${userCount}`);
  console.log(`💳 Total loans seeded to Supabase: ${loanCount}`);
}

main().catch((err) => {
  console.error('Fatal error in seeding:', err);
  process.exit(1);
});
