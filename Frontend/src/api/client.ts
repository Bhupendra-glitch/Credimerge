import axios from 'axios';
import type { Loan, User } from '../types';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const browserApiUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';
const productionApiUrl = 'https://credimerge-api.onrender.com';
export const API_URL = (configuredApiUrl || (import.meta.env.PROD ? productionApiUrl : browserApiUrl))
  .replace(/\/$/, '');

export function buildProfileLoanFallback(user: User): Loan[] {
  const debt = Number(user.existing_debt || 0);
  if (!Number.isFinite(debt) || debt <= 0) return [];

  const categories = [
    { key: 'credit_card_balance', type: 'Credit Card', rate: 36, tenure: 24 },
    { key: 'bnpl_balance', type: 'BNPL', rate: 24, tenure: 12 },
    { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', rate: 12, tenure: 48 },
  ] as const;

  const loans = categories
    .map((category) => ({
      id: `profile-${category.key}`,
      type: category.type,
      lender: 'GigCred profile estimate',
      outstanding: Number(user[category.key] || 0),
      rate: category.rate,
      tenure: category.tenure,
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
  const token = localStorage.getItem('credimerge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

export const api = {
  login: (userId: string, password: string) =>
    client.post('/api/login', { userId, password }),

  getUser: (id: string) => client.get(`/api/user/${id}`),

  getMe: () => client.get('/api/me'),

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
};

export default client;
