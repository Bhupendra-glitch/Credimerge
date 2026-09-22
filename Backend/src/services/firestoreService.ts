import fs from 'fs';
import path from 'path';
import { getDb, Timestamp } from '../config/firebaseAdmin';

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
    path.resolve(process.cwd(), 'src', 'data', 'users.csv'),
    path.resolve(__dirname, '..', 'data', 'users.csv'),
  ].find((candidate) => fs.existsSync(candidate));

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
  const snap = await getDb().collection('users').doc(userId).collection('loans').orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as LoanRecord[];
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
