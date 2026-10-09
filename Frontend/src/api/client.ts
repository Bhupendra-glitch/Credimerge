import axios from 'axios';
import type { Loan, User } from '../types';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const browserApiUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';
const productionApiUrl = 'https://credimerge0.onrender.com';
export const API_URL = (configuredApiUrl || (import.meta.env.PROD ? productionApiUrl : browserApiUrl))
  .replace(/\/$/, '');

export function buildProfileLoanFallback(user: User): Loan[] {
  // Only provide demo loan fallback for synthetic GIG demo accounts
  const userId = String(user?.user_id || user?.userId || '');
  if (!/^GIG10\d{2}$/i.test(userId)) {
    return [];
  }

  const debt = Number(user.existing_debt || 0);
  if (!Number.isFinite(debt) || debt <= 0) return [];

  const categories: Array<{
    key: keyof Pick<User, 'credit_card_balance' | 'bnpl_balance' | 'vehicle_loan_outstanding'>;
    type: string;
    rate: number;
    tenure: number;
  }> = [
    { key: 'credit_card_balance', type: 'Credit Card', rate: 36, tenure: 24 },
    { key: 'bnpl_balance', type: 'BNPL', rate: 24, tenure: 12 },
    { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', rate: 12, tenure: 48 },
  ];

  const loans: Loan[] = categories
    .map((category) => ({
      id: `profile-${category.key}`,
      type: category.type,
      lender: 'GigCred profile estimate',
      outstanding: Number(user[category.key] || 0),
      rate: category.rate,
      tenure: category.tenure,
      emi: 0,
    }))
    .filter((loan) => Number.isFinite(loan.outstanding) && loan.outstanding > 0);

  const categorizedDebt = loans.reduce((total, loan) => total + loan.outstanding, 0);
  const remainingDebt = Math.max(0, debt - categorizedDebt);
  if (remainingDebt > 0) {
    loans.push({
      id: 'profile-existing-debt',
      type: 'Personal Loan',
      lender: 'GigCred profile estimate',
      outstanding: remainingDebt,
      rate: 18,
      tenure: 36,
      emi: 0,
    });
  }

  return loans.map((loan) => ({
    ...loan,
    emi: Number(user.monthly_emi) > 0
      ? +(Number(user.monthly_emi) * loan.outstanding / debt).toFixed(2)
      : 0,
  }));
}

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('credimerge_token') || sessionStorage.getItem('credimerge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

export const api = {
  login: (identifier: string, password: string) =>
    client.post('/api/auth/login', {
      email: identifier.includes('@') ? identifier : undefined,
      userId: identifier.includes('@') ? undefined : identifier,
      password,
    }),

  register: (payload: { email: string; password: string; fullName: string; workerType?: string }) =>
    client.post('/api/auth/register', payload),

  verifyEmail: (email: string, code: string) =>
    client.post('/api/auth/verify-email', { email, code }),

  resendVerification: (email: string) =>
    client.post('/api/auth/resend-verification', { email }),

  googleAuth: (payload: { email: string; name?: string; picture?: string; credential?: string }) =>
    client.post('/api/auth/google', payload),

  getUser: (id: string) => client.get(`/api/user/${id}`),

  getMe: () => client.get('/api/me'),

  updateProfile: (profile: { fullName: string; email: string; phone: string }) =>
    client.patch('/api/me/profile', profile),

  updateProfilePhoto: (profilePhoto: string | null) =>
    client.patch('/api/me/photo', { profilePhoto }),

  changePassword: (passwords: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    client.post('/api/me/password', passwords),

  requestPasswordReset: (email: string) =>
    client.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    client.post('/api/auth/reset-password', { token, newPassword, confirmPassword }),

  getLoans: () => client.get('/api/loans'),

  createLoan: (loan: Record<string, unknown>) => client.post('/api/loans', loan),

  updateLoan: (id: string, loan: Record<string, unknown>) => client.put(`/api/loans/${id}`, loan),

  deleteLoan: (id: string) => client.delete(`/api/loans/${id}`),

  getLatestCreditReport: () => client.get('/api/credit-health/latest'),

  analyzeCreditHealth: (file: File) => {
    const formData = new FormData();
    formData.append('statement', file);
    return client.post('/api/credit-health/analyze', formData);
  },

  calculateEmi: (principal: number, rate: number, tenure: number) =>
    client.post('/api/emi/calculate', { principal, rate, tenure }),

  amortization: (loan: any) =>
    client.post('/api/emi/amortization', { loan }),

  aggregate: (loans: any[]) =>
    client.post('/api/emi/aggregate', { loans }),

  chatWithAI: (message: string, context?: unknown) =>
    client.post('/api/ai/chat', { message, context }),

  // Real-Time Transactions & Accounts
  getTransactions: (params?: Record<string, any>) =>
    client.get('/api/transactions', { params }),

  getTransactionSummary: () =>
    client.get('/api/transactions/summary'),

  createTransaction: (data: Record<string, unknown>) =>
    client.post('/api/transactions', data),

  updateTransactionCategory: (id: string, category: string) =>
    client.patch(`/api/transactions/${id}/category`, { category }),

  deleteTransaction: (id: string) =>
    client.delete(`/api/transactions/${id}`),

  getLinkedAccounts: () =>
    client.get('/api/accounts'),

  connectSandboxAccount: (institutionName?: string) =>
    client.post('/api/accounts/connect-sandbox', { institutionName }),

  syncAccount: (accountId: string) =>
    client.post('/api/accounts/sync', { accountId }),

  getConsent: () =>
    client.get('/api/accounts/consent'),

  createConsent: (data: Record<string, unknown>) =>
    client.post('/api/accounts/consent', data),

  revokeConsent: (consentId: string) =>
    client.post('/api/accounts/consent/revoke', { consentId }),

  getTransactionInsights: () =>
    client.get('/api/advisor/transaction-insights'),

  getTeeAttestation: (nonce?: string) =>
    client.get('/api/tee/attestation', { params: { nonce } }),

  computeTeeRisk: () =>
    client.post('/api/tee/compute-risk'),
};

export default client;
