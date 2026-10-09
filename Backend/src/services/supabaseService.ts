import fs from 'fs';
import path from 'path';
import { getSupabase } from '../config/supabase';
import { calculateEmi } from './emiService';

export interface LoanRecord {
  id: string;
  user_id?: string;
  userId?: string;
  type: string;
  lender: string;
  outstanding: number;
  rate: number;
  tenure: number;
  emi: number;
  createdAt?: any;
  updatedAt?: any;
  created_at?: any;
  updated_at?: any;
  [key: string]: any;
}

// In-memory fallback caches for development or offline fallback
const localUsers = new Map<string, Record<string, any>>();
const localLoans = new Map<string, LoanRecord[]>();
const localVerificationCodes = new Map<string, { code: string; expiresAt: number }>();
const localResetTokens = new Map<string, { userId: string; expiresAt: number }>();
const localCreditReports = new Map<string, any[]>();

function getDemoUser(userId: string): Record<string, any> | null {
  if (process.env.ALLOW_DEMO_LOGIN !== 'true') return null;
  if (!/^GIG10\d{2}$/i.test(String(userId || '').trim())) return null;

  const candidates = [
    process.env.SEED_CSV ? path.resolve(process.env.SEED_CSV) : '',
    path.resolve(process.cwd(), 'GigCred_synthetic_10_users.csv'),
    path.resolve(process.cwd(), '..', 'GigCred_synthetic_10_users.csv'),
    path.resolve(process.cwd(), 'src', 'data', 'users.csv'),
    path.resolve(__dirname, '..', 'data', 'users.csv'),
  ];
  const csvPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!csvPath) return null;

  const [headerLine, ...dataLines] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((header) => header.trim());
  const row = dataLines.find((line) => line.split(',')[0]?.trim().toUpperCase() === userId.toUpperCase());
  if (!row) return null;

  const values = row.split(',');
  const parsed = headers.reduce<Record<string, any>>((user, header, index) => {
    const value = values[index]?.trim() ?? '';
    user[header] = value !== '' && !Number.isNaN(Number(value)) ? Number(value) : value;
    return user;
  }, {});

  return normalizeUser(parsed);
}

function calculateDemoEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function getDemoLoans(userId: string): LoanRecord[] {
  if (!/^GIG10\d{2}$/i.test(String(userId || '').trim())) return [];
  const user = getDemoUser(userId) || localUsers.get(userId.toUpperCase());
  if (!user) return [];

  const debt = Number(user.existing_debt || 0);
  if (!Number.isFinite(debt) || debt <= 0) return [];

  const categories = [
    { key: 'credit_card_balance', type: 'Credit Card', lender: 'HDFC Bank', rate: 36, tenure: 24 },
    { key: 'bnpl_balance', type: 'BNPL', lender: 'Simpl / LazyPay', rate: 24, tenure: 12 },
    { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', lender: 'Bajaj Finance', rate: 12, tenure: 48 },
  ];

  const loans = categories
    .map((category) => ({ ...category, outstanding: Number(user[category.key] || 0) }))
    .filter((loan) => Number.isFinite(loan.outstanding) && loan.outstanding > 0);
  const categorizedDebt = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const remainingDebt = Math.max(0, debt - categorizedDebt);

  if (remainingDebt > 0) {
    loans.push({
      key: 'existing_debt',
      type: 'Personal Loan',
      lender: 'State Bank of India',
      outstanding: remainingDebt,
      rate: 18,
      tenure: 36,
    });
  }

  const monthlyEmi = Number(user.monthly_emi || 0);
  return loans.map((loan, index) => ({
    id: `demo-${userId.toUpperCase()}-${index + 1}`,
    user_id: userId.toUpperCase(),
    userId: userId.toUpperCase(),
    type: loan.type,
    lender: loan.lender,
    outstanding: +loan.outstanding.toFixed(2),
    rate: loan.rate,
    tenure: loan.tenure,
    emi: +(monthlyEmi > 0
      ? (monthlyEmi * loan.outstanding) / debt
      : calculateDemoEmi(loan.outstanding, loan.rate, loan.tenure)
    ).toFixed(2),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Normalizes user record between snake_case and camelCase to satisfy
 * both frontend and backend expectations.
 */
export function normalizeUser(raw: Record<string, any>): Record<string, any> {
  if (!raw) return raw;
  const userId = String(raw.user_id || raw.userId || '').toUpperCase();
  const fullName = raw.full_name || raw.fullName || raw.name || '';
  const email = (raw.email || '').toLowerCase();

  return {
    ...raw,
    user_id: userId,
    userId,
    full_name: fullName,
    fullName,
    email,
    password_hash: raw.password_hash || raw.passwordHash || undefined,
    passwordHash: raw.password_hash || raw.passwordHash || undefined,
    email_verified: Boolean(raw.email_verified ?? raw.emailVerified),
    emailVerified: Boolean(raw.email_verified ?? raw.emailVerified),
    profile_photo: raw.profile_photo ?? raw.profilePhoto ?? null,
    profilePhoto: raw.profile_photo ?? raw.profilePhoto ?? null,
    worker_type: raw.worker_type || raw.workerType || 'Gig Worker',
    workerType: raw.worker_type || raw.workerType || 'Gig Worker',
    auth_provider: raw.auth_provider || raw.authProvider || 'local',
    authProvider: raw.auth_provider || raw.authProvider || 'local',
  };
}

export function sanitizeUser(user: Record<string, any> | null) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.password;
  delete safe.password_hash;
  delete safe.passwordHash;
  return safe;
}

export async function createOrUpdateUser(userData: Record<string, any>) {
  const userId = String(userData.userId || userData.user_id || '').toUpperCase();
  if (!userId) throw new Error('userId is required');

  const normalized = normalizeUser(userData);
  localUsers.set(userId, normalized);
  if (normalized.email) {
    localUsers.set(normalized.email, normalized);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const payload: Record<string, any> = {
        user_id: userId,
        email: normalized.email || null,
        full_name: normalized.fullName || null,
        phone: normalized.phone || null,
        profile_photo: normalized.profilePhoto || null,
        email_verified: normalized.emailVerified,
        auth_provider: normalized.authProvider,
        age: normalized.age != null ? Number(normalized.age) : null,
        worker_type: normalized.worker_type || null,
        monthly_income: Number(normalized.monthly_income || 0),
        income_stability_score: Number(normalized.income_stability_score || 0),
        monthly_expenses: Number(normalized.monthly_expenses || 0),
        monthly_savings: Number(normalized.monthly_savings || 0),
        existing_debt: Number(normalized.existing_debt || 0),
        monthly_emi: Number(normalized.monthly_emi || 0),
        credit_card_balance: Number(normalized.credit_card_balance || 0),
        bnpl_balance: Number(normalized.bnpl_balance || 0),
        vehicle_loan_outstanding: Number(normalized.vehicle_loan_outstanding || 0),
        active_loan_count: Number(normalized.active_loan_count || 0),
        repayment_rate: Number(normalized.repayment_rate || 0),
        missed_payments_12m: Number(normalized.missed_payments_12m || 0),
        foir_pct: Number(normalized.foir_pct || 0),
        monthly_cashflow: Number(normalized.monthly_cashflow || 0),
        emergency_expense: Number(normalized.emergency_expense || 0),
        income_drop_scenario_pct: Number(normalized.income_drop_scenario_pct || 0),
        cashflow_score: Number(normalized.cashflow_score || 0),
        risk_band: normalized.risk_band || 'Low Risk',
        forecast_30d_cashflow: Number(normalized.forecast_30d_cashflow || 0),
        forecast_60d_cashflow: Number(normalized.forecast_60d_cashflow || 0),
        forecast_90d_cashflow: Number(normalized.forecast_90d_cashflow || 0),
        new_loan_amount: Number(normalized.new_loan_amount || 0),
        new_loan_interest_pct: Number(normalized.new_loan_interest_pct || 0),
        new_loan_emi_24m: Number(normalized.new_loan_emi_24m || 0),
        stress_cashflow_after_new_loan: Number(normalized.stress_cashflow_after_new_loan || 0),
        stress_foir_pct: Number(normalized.stress_foir_pct || 0),
        updated_at: new Date().toISOString(),
      };

      if (normalized.passwordHash) {
        payload.password_hash = normalized.passwordHash;
      }

      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        console.warn('Supabase upsert user warning:', error.message);
      }
    } catch (error) {
      console.warn('Supabase user save error, saved to local cache:', error instanceof Error ? error.message : error);
    }
  }

  return sanitizeUser(normalized);
}

export async function getUserProfile(userId: string) {
  const normalizedId = userId.trim().toUpperCase();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', normalizedId)
        .maybeSingle();

      if (!error && data) {
        return sanitizeUser(normalizeUser(data));
      }
    } catch (error) {
      console.warn('Supabase profile query failed; using fallback:', error instanceof Error ? error.message : error);
    }
  }

  const local = localUsers.get(normalizedId);
  if (local) return sanitizeUser(local);

  if (/^GIG10\d{2}$/i.test(normalizedId)) {
    const demo = getDemoUser(normalizedId);
    if (demo) return sanitizeUser(demo);
  }

  return null;
}

export async function getUserAuthRecord(identifier: string) {
  const normalized = identifier.trim();
  const supabase = getSupabase();

  if (supabase) {
    try {
      if (normalized.includes('@')) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('email', normalized.toLowerCase())
          .maybeSingle();
        if (!error && data) return normalizeUser(data);
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', normalized.toUpperCase())
          .maybeSingle();
        if (!error && data) return normalizeUser(data);
      }
    } catch (error) {
      console.warn('Supabase auth record query error:', error instanceof Error ? error.message : error);
    }
  }

  const local =
    localUsers.get(normalized.toLowerCase()) ||
    localUsers.get(normalized.toUpperCase());
  if (local) return normalizeUser(local);

  if (/^GIG10\d{2}$/i.test(normalized)) {
    const demo = getDemoUser(normalized);
    if (demo) return normalizeUser(demo);
  }

  return null;
}

export async function updateUserProfile(
  userId: string,
  profile: { fullName: string; email: string; phone: string }
) {
  const normalizedId = userId.toUpperCase();
  const local = localUsers.get(normalizedId);
  if (local) {
    Object.assign(local, profile, {
      full_name: profile.fullName,
      fullName: profile.fullName,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (profile.email) {
      localUsers.set(profile.email.toLowerCase(), local);
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: profile.fullName,
          email: profile.email.toLowerCase(),
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', normalizedId)
        .select()
        .maybeSingle();

      if (!error && data) {
        return sanitizeUser(normalizeUser(data));
      }
    } catch (error) {
      console.warn('Supabase updateUserProfile error:', error);
    }
  }

  return local ? sanitizeUser(local) : null;
}

export async function updateUserPhoto(userId: string, profilePhoto: string | null) {
  const normalizedId = userId.toUpperCase();
  const local = localUsers.get(normalizedId);
  if (local) {
    local.profilePhoto = profilePhoto;
    local.profile_photo = profilePhoto;
    local.updatedAt = new Date().toISOString();
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          profile_photo: profilePhoto,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', normalizedId)
        .select()
        .maybeSingle();

      if (!error && data) {
        return sanitizeUser(normalizeUser(data));
      }
    } catch (error) {
      console.warn('Supabase updateUserPhoto error:', error);
    }
  }

  return local ? sanitizeUser(local) : null;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const normalizedId = userId.toUpperCase();
  const local = localUsers.get(normalizedId);
  if (local) {
    local.passwordHash = passwordHash;
    local.password_hash = passwordHash;
    local.password = null;
    local.updatedAt = new Date().toISOString();
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', normalizedId);

      if (!error) return true;
      console.warn('Supabase updateUserPassword error:', error.message);
    } catch (error) {
      console.warn('Supabase updateUserPassword error:', error);
    }
  }

  return Boolean(local);
}

export async function storeEmailVerificationCode(email: string, code: string, expiresAt: Date) {
  const normalizedEmail = email.trim().toLowerCase();
  localVerificationCodes.set(normalizedEmail, { code, expiresAt: expiresAt.getTime() });

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('verification_codes').upsert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      console.warn('Supabase storeEmailVerificationCode error:', error);
    }
  }
}

export async function verifyEmailCodeRecord(email: string, code: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const local = localVerificationCodes.get(normalizedEmail);
  if (local && Date.now() <= local.expiresAt && local.code === code.trim()) {
    localVerificationCodes.delete(normalizedEmail);
    return true;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!error && data) {
        const expiry = new Date(data.expires_at).getTime();
        if (Date.now() <= expiry && data.code === code.trim()) {
          await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
          return true;
        }
      }
    } catch (error) {
      console.warn('Supabase verifyEmailCodeRecord error:', error);
    }
  }

  return false;
}

export async function createPasswordResetToken(
  userId: string,
  token: string,
  expiresAt: Date
) {
  localResetTokens.set(token, { userId, expiresAt: expiresAt.getTime() });

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('password_reset_tokens').insert({
        token,
        user_id: userId.toUpperCase(),
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      console.warn('Supabase createPasswordResetToken error:', error);
    }
  }
}

export async function consumePasswordResetToken(token: string, passwordHash: string): Promise<boolean> {
  const local = localResetTokens.get(token);
  if (local && Date.now() <= local.expiresAt) {
    localResetTokens.delete(token);
    await updateUserPassword(local.userId, passwordHash);
    return true;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (!error && data) {
        const expiry = new Date(data.expires_at).getTime();
        if (Date.now() <= expiry) {
          await updateUserPassword(data.user_id, passwordHash);
          await supabase.from('password_reset_tokens').delete().eq('token', token);
          return true;
        }
      }
    } catch (error) {
      console.warn('Supabase consumePasswordResetToken error:', error);
    }
  }

  return false;
}

export async function listLoans(userId: string): Promise<LoanRecord[]> {
  const normalizedId = userId.toUpperCase();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', normalizedId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item) => ({
          ...item,
          id: item.id,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })) as LoanRecord[];
      }
    } catch (error) {
      console.warn('Supabase listLoans error:', error);
    }
  }

  const local = localLoans.get(normalizedId);
  if (local && local.length > 0) return local;

  if (/^GIG10\d{2}$/i.test(normalizedId) && process.env.ALLOW_DEMO_LOGIN === 'true') {
    const demoLoans = getDemoLoans(normalizedId);
    if (demoLoans.length > 0) {
      localLoans.set(normalizedId, demoLoans);
      return demoLoans;
    }
  }

  return [];
}

export async function syncUserTotalsFromLoans(userId: string) {
  const normalizedId = userId.toUpperCase();
  const loans = await listLoans(normalizedId);
  const totalDebt = loans.reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
  const totalEmi = loans.reduce((sum, l) => sum + Number(l.emi || 0), 0);
  const creditCardBalance = loans
    .filter((l) => /credit/i.test(l.type))
    .reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
  const bnplBalance = loans
    .filter((l) => /bnpl/i.test(l.type))
    .reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
  const vehicleBalance = loans
    .filter((l) => /vehicle|auto/i.test(l.type))
    .reduce((sum, l) => sum + Number(l.outstanding || 0), 0);

  const local = localUsers.get(normalizedId);
  const monthlyIncome = Number(local?.monthly_income || 0);
  const foir = monthlyIncome > 0 ? +((totalEmi / monthlyIncome) * 100).toFixed(2) : 0;

  const updates = {
    existing_debt: +totalDebt.toFixed(2),
    monthly_emi: +totalEmi.toFixed(2),
    active_loan_count: loans.length,
    credit_card_balance: +creditCardBalance.toFixed(2),
    bnpl_balance: +bnplBalance.toFixed(2),
    vehicle_loan_outstanding: +vehicleBalance.toFixed(2),
    foir_pct: foir,
    updated_at: new Date().toISOString(),
  };

  if (local) {
    Object.assign(local, updates);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('users').update(updates).eq('user_id', normalizedId);
    } catch (err) {
      console.warn('Failed to sync user totals in Supabase:', err);
    }
  }
}

export async function getLoan(userId: string, loanId: string): Promise<LoanRecord | null> {
  const normalizedId = userId.toUpperCase();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', normalizedId)
        .eq('id', loanId)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as LoanRecord;
      }
    } catch (error) {
      console.warn('Supabase getLoan error:', error);
    }
  }

  const list = await listLoans(normalizedId);
  return list.find((l) => l.id === loanId) || null;
}

export async function createLoan(userId: string, data: Record<string, any>) {
  const normalizedId = userId.toUpperCase();
  const loanId = data.id || `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: LoanRecord = {
    id: loanId,
    user_id: normalizedId,
    userId: normalizedId,
    type: String(data.type),
    lender: String(data.lender),
    outstanding: Number(data.outstanding),
    rate: Number(data.rate),
    tenure: Number(data.tenure),
    emi: Number(data.emi),
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
  };

  const current = localLoans.get(normalizedId) || [];
  localLoans.set(normalizedId, [record, ...current]);

  let result = record;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('loans')
        .insert({
          id: loanId,
          user_id: normalizedId,
          type: record.type,
          lender: record.lender,
          outstanding: record.outstanding,
          rate: record.rate,
          tenure: record.tenure,
          emi: record.emi,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && inserted) {
        result = { ...inserted, createdAt: inserted.created_at, updatedAt: inserted.updated_at };
      }
      if (error) console.warn('Supabase createLoan warning:', error.message);
    } catch (error) {
      console.warn('Supabase createLoan error:', error);
    }
  }

  await syncUserTotalsFromLoans(normalizedId);
  return result;
}

export async function updateLoan(userId: string, loanId: string, data: Record<string, any>) {
  const normalizedId = userId.toUpperCase();
  const now = new Date().toISOString();

  const current = localLoans.get(normalizedId) || [];
  const index = current.findIndex((l) => l.id === loanId);
  if (index !== -1) {
    current[index] = { ...current[index], ...data, updated_at: now, updatedAt: now };
  }

  let result = index !== -1 ? current[index] : null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: updated, error } = await supabase
        .from('loans')
        .update({
          ...data,
          updated_at: now,
        })
        .eq('id', loanId)
        .eq('user_id', normalizedId)
        .select()
        .maybeSingle();

      if (!error && updated) {
        result = { ...updated, createdAt: updated.created_at, updatedAt: updated.updated_at };
      }
    } catch (error) {
      console.warn('Supabase updateLoan error:', error);
    }
  }

  await syncUserTotalsFromLoans(normalizedId);
  return result;
}

export async function deleteLoan(userId: string, loanId: string): Promise<boolean> {
  const normalizedId = userId.toUpperCase();
  const current = localLoans.get(normalizedId) || [];
  localLoans.set(normalizedId, current.filter((l) => l.id !== loanId));

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)
        .eq('user_id', normalizedId);

      if (error) console.warn('Supabase deleteLoan warning:', error.message);
    } catch (error) {
      console.warn('Supabase deleteLoan error:', error);
    }
  }

  await syncUserTotalsFromLoans(normalizedId);
  return true;
}

export async function saveCreditReport(userId: string, report: Record<string, any>) {
  const normalizedId = userId.toUpperCase();
  const now = new Date().toISOString();
  const item = {
    id: `report-${Date.now()}`,
    userId: normalizedId,
    user_id: normalizedId,
    ...report,
    created_at: now,
    createdAt: now,
  };

  const reports = localCreditReports.get(normalizedId) || [];
  localCreditReports.set(normalizedId, [item, ...reports]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .insert({
          user_id: normalizedId,
          report,
          created_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        return { id: data.id, ...report, createdAt: data.created_at };
      }
    } catch (error) {
      console.warn('Supabase saveCreditReport error:', error);
    }
  }

  return item;
}

export async function getLatestCreditReport(userId: string) {
  const normalizedId = userId.toUpperCase();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('user_id', normalizedId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          ...(typeof data.report === 'object' ? data.report : {}),
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.warn('Supabase getLatestCreditReport error:', error);
    }
  }

  const reports = localCreditReports.get(normalizedId);
  return reports && reports.length > 0 ? reports[0] : null;
}
