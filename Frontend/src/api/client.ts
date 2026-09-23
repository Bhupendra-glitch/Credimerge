import axios from 'axios';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const browserApiUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';
const productionApiUrl = 'https://credimerge-api.onrender.com';
const API_URL = (configuredApiUrl || (import.meta.env.PROD ? productionApiUrl : browserApiUrl))
  .replace(/\/$/, '');

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

<<<<<<< HEAD
  chatWithAI: (message: string, context?: unknown) =>
    client.post('/api/ai/chat', { message, context }),
=======
  chatWithAi: (message: string) =>
    client.post('/api/ai/chat', { message }),
>>>>>>> de926d5364dbea3758568bd4733a8d52bbf87ec1
};

export default client;
