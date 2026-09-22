import axios from 'axios';

const browserApiUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || browserApiUrl;

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('credimerge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    return client.post('/api/credit-health/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  calculateEmi: (principal: number, rate: number, tenure: number) =>
    client.post('/api/emi/calculate', { principal, rate, tenure }),

  amortization: (loan: any) =>
    client.post('/api/emi/amortization', { loan }),

  aggregate: (loans: any[]) =>
    client.post('/api/emi/aggregate', { loans }),
};

export default client;