import axios from 'axios';

const API_URL = 'http://localhost:5000';

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