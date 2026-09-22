import fs from 'fs';
import path from 'path';
import { getDb, Timestamp } from '../config/firebaseAdmin';
import { calculateEmi } from './emiService';

export interface LoanRecord {
  id: string;
  type: string;
  lender: string;
  outstanding: number;
  rate: number;
  tenure: number;
  emi: number;
  createdAt: any;
  updatedAt: any;
  [key: string]: any;
}

function getDemoUser(userId: string): Record<string, any> | null {
  if (process.env.NODE_ENV === 'production') return null;

  const csvPath = [
    process.env.SEED_CSV ? path.resolve(process.env.SEED_CSV) : '',
    path.resolve(process.cwd(), 'GigCred_synthetic_10_users.csv'),
    path.resolve(process.cwd(), 'src', 'data', 'users.csv'),
    path.resolve(__dirname, '..', 'data', 'users.csv'),
  ].find((candidate) => candidate && fs.existsSync(candidate));

  if (!csvPath) return null;
  const [headerLine, ...dataLines] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((header) => header.trim());
  const row = dataLines.find((line) => line.split(',')[0]?.trim().toUpperCase() === userId.toUpperCase());
  if (!row) return null;

  const values = row.split(',');
  return headers.reduce<Record<string, any>>((user, header, index) => {
    const value = values[index]?.trim() ?? '';
    user[header] = value !== '' && !Number.isNaN(Number(value)) ? Number(value) : value;
    return user;
  }, {});
}

function calculateDemoEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function getDemoLoans(userId: string): LoanRecord[] {
  const user = getDemoUser(userId);
  if (!user) return [];

  const debt = Number(user.existing_debt || 0);
  if (!Number.isFinite(debt) || debt <= 0) return [];

  const categories = [
    { key: 'credit_card_balance', type: 'Credit Card', lender: 'Demo lender', rate: 36, tenure: 24 },
    { key: 'bnpl_balance', type: 'BNPL', lender: 'Demo lender', rate: 24, tenure: 12 },
    { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', lender: 'Demo lender', rate: 12, tenure: 48 },
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
      lender: 'Demo lender',
      outstanding: remainingDebt,
      rate: 18,
      tenure: 36,
    });
  }

  const monthlyEmi = Number(user.monthly_emi || 0);
  return loans.map((loan, index) => ({
    id: `demo-${userId.toUpperCase()}-${index + 1}`,
    type: loan.type,
    lender: loan.lender,
    outstanding: +loan.outstanding.toFixed(2),
    rate: loan.rate,
    tenure: loan.tenure,
    emi: +(monthlyEmi > 0
      ? monthlyEmi * loan.outstanding / debt
      : calculateDemoEmi(loan.outstanding, loan.rate, loan.tenure)).toFixed(2),
    createdAt: null,
    updatedAt: null,
  }));
}

export async function getUserProfile(userId: string) {
  try {
    const snap = await getDb().collection('users').doc(userId).get();
    if (snap.exists) {
      const data = { ...(snap.data() || {}) } as Record<string, any>;
      delete data.passwordHash;
      delete data.password;
      return { userId: snap.id, ...data };
    }
  } catch (error) {
    console.warn('Firestore unavailable; using development demo data:', error instanceof Error ? error.message : error);
  }

  const data = getDemoUser(userId);
  if (!data) return null;
  delete data.passwordHash;
  delete data.password;
  return { userId: userId.toUpperCase(), ...data };
}

export async function getUserAuthRecord(userId: string) {
  try {
    const snap = await getDb().collection('users').doc(userId).get();
    if (snap.exists) return { userId: snap.id, ...(snap.data() || {}) } as Record<string, any>;
  } catch (error) {
    console.warn('Firestore unavailable; using development demo data:', error instanceof Error ? error.message : error);
  }

  const data = getDemoUser(userId);
  return data ? { userId: userId.toUpperCase(), ...data } : null;
}

export async function listLoans(userId: string): Promise<LoanRecord[]> {
  try {
    const snap = await getDb().collection('users').doc(userId).collection('loans').orderBy('createdAt', 'desc').get();
    if (snap.docs.length) {
      return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as LoanRecord[];
    }
  } catch (error) {
    console.warn('Firestore unavailable; using development demo loans:', error instanceof Error ? error.message : error);
  }

  return getDemoLoans(userId);
}

export async function getLoan(userId: string, loanId: string): Promise<LoanRecord | null> {
  const snap = await getDb().collection('users').doc(userId).collection('loans').doc(loanId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as any) } as LoanRecord;
}

export async function createLoan(userId: string, data: Record<string, any>) {
  const ref = getDb().collection('users').doc(userId).collection('loans').doc();
  const now = Timestamp.now();
  const payload = { ...data, createdAt: now, updatedAt: now };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function updateLoan(userId: string, loanId: string, data: Record<string, any>) {
  const ref = getDb().collection('users').doc(userId).collection('loans').doc(loanId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const payload = { ...data, updatedAt: Timestamp.now() };
  await ref.update(payload);
  return { id: loanId, ...(snap.data() || {}), ...payload };
}

export async function deleteLoan(userId: string, loanId: string) {
  const ref = getDb().collection('users').doc(userId).collection('loans').doc(loanId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

export async function saveCreditReport(userId: string, report: Record<string, any>) {
  const ref = getDb().collection('users').doc(userId).collection('creditReports').doc();
  const payload = { ...report, createdAt: Timestamp.now() };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function getLatestCreditReport(userId: string) {
  const snap = await getDb().collection('users').doc(userId).collection('creditReports').orderBy('createdAt', 'desc').limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as any) };
}
