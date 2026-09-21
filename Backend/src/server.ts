import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { login } from './services/authService';
import { findUser, getSafeUser, loadUsers } from './services/csvService';
import { authenticate, AuthRequest } from './middleware/auth';
import { aggregateLoans, calculateEmi, totalInterest, buildAmortizationTable } from './services/emiService';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CrediMerge API', users: loadUsers().length });
});

// ---------- AUTH ----------
app.post('/api/login', (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password required' });
  }
  try {
    const result = login(userId.trim().toUpperCase(), password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// ---------- USER ----------
app.get('/api/user/:id', authenticate, (req: AuthRequest, res) => {
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(getSafeUser(user));
});

// ---------- EMI CALCULATIONS ----------
app.post('/api/emi/calculate', (req, res) => {
  const { principal, rate, tenure } = req.body;
  if (!principal || !rate || !tenure) {
    return res.status(400).json({ error: 'principal, rate, tenure required' });
  }
  const emi = calculateEmi(principal, rate, tenure);
  const interest = totalInterest(principal, rate, tenure);
  res.json({
    emi: +emi.toFixed(2),
    totalInterest: +interest.toFixed(2),
    totalPayment: +(emi * tenure).toFixed(2),
  });
});

app.post('/api/emi/amortization', (req, res) => {
  const { loan } = req.body;
  if (!loan) return res.status(400).json({ error: 'loan required' });
  res.json(buildAmortizationTable(loan));
});

app.post('/api/emi/aggregate', (req, res) => {
  const { loans } = req.body;
  if (!Array.isArray(loans)) return res.status(400).json({ error: 'loans array required' });
  res.json(aggregateLoans(loans));
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 CrediMerge API running on http://localhost:${PORT}`);
  console.log(`📊 Loaded ${loadUsers().length} users from CSV`);
});