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

export async function getUserProfile(userId: string) {
  const snap = await getDb().collection('users').doc(userId).get();
  if (!snap.exists) return null;
  const data = { ...(snap.data() || {}) } as Record<string, any>;
  delete data.passwordHash;
  delete data.password;
  return { userId: snap.id, ...data };
}

export async function getUserAuthRecord(userId: string) {
  const snap = await getDb().collection('users').doc(userId).get();
  if (!snap.exists) return null;
  return { userId: snap.id, ...(snap.data() || {}) } as Record<string, any>;
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
