import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { authenticate, AuthRequest } from './middleware/auth';
import { login } from './services/authService';
import { calculateEmi, totalInterest, buildAmortizationTable, aggregateLoans } from './services/emiService';
import {
  getUserProfile,
  listLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  saveCreditReport,
  getLatestCreditReport,
} from './services/firestoreService';
import { buildStatementProfile } from './services/statementService';
import { assessLoanApp } from './services/loanDetectorService';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({ origin: origins.length === 1 ? origins[0] : origins }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'CrediMerge API', version: '2.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/login', async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ error: 'User ID and password required' });

  try {
    return res.json(await login(String(userId), String(password)));
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

app.get('/api/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await getUserProfile(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load user' });
  }
});

// Compatibility with the current frontend.
app.get('/api/user/:id', authenticate, async (req: AuthRequest, res) => {
  if (req.params.id.toUpperCase() !== req.user!.userId.toUpperCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const user = await getUserProfile(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load user' });
  }
});

app.get('/api/loans', authenticate, async (req: AuthRequest, res) => {
  try {
    return res.json(await listLoans(req.user!.userId));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load loans' });
  }
});

app.post('/api/loans', authenticate, async (req: AuthRequest, res) => {
  const body = req.body || {};
  const type = String(body.type || '').trim();
  const lender = String(body.lender || '').trim();
  const outstanding = Number(body.outstanding);
  const rate = Number(body.rate);
  const tenure = Number(body.tenure);

  if (!type || !lender || !Number.isFinite(outstanding) || outstanding <= 0 ||
      !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(tenure) || tenure <= 0) {
    return res.status(400).json({
      error: 'type, lender, outstanding, rate and tenure are required',
    });
  }

  try {
    const inputEmi = Number(body.emi);
    const emi = Number.isFinite(inputEmi) && inputEmi > 0
      ? inputEmi
      : calculateEmi(outstanding, rate, tenure);

    const loan = await createLoan(req.user!.userId, {
      type,
      lender,
      outstanding,
      rate,
      tenure,
      emi: +emi.toFixed(2),
    });

    return res.status(201).json(loan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to create loan' });
  }
});

app.get('/api/loans/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const loan = await getLoan(req.user!.userId, req.params.id);
    return loan ? res.json(loan) : res.status(404).json({ error: 'Loan not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load loan' });
  }
});

app.put('/api/loans/:id', authenticate, async (req: AuthRequest, res) => {
  const allowed = ['type', 'lender', 'outstanding', 'rate', 'tenure', 'emi'];
  const updates: Record<string, any> = {};

  for (const key of allowed) {
    if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  }

  if ('outstanding' in updates) updates.outstanding = Number(updates.outstanding);
  if ('rate' in updates) updates.rate = Number(updates.rate);
  if ('tenure' in updates) updates.tenure = Number(updates.tenure);
  if ('emi' in updates) updates.emi = Number(updates.emi);

  try {
    const existing = await getLoan(req.user!.userId, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    const merged = { ...existing, ...updates };
    if (!('emi' in updates) &&
        (updates.outstanding !== undefined || updates.rate !== undefined || updates.tenure !== undefined)) {
      updates.emi = +calculateEmi(
        Number(merged.outstanding),
        Number(merged.rate),
        Number(merged.tenure)
      ).toFixed(2);
    }

    return res.json(await updateLoan(req.user!.userId, req.params.id, updates));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to update loan' });
  }
});

app.delete('/api/loans/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const ok = await deleteLoan(req.user!.userId, req.params.id);
    return ok ? res.json({ message: 'Loan deleted' }) : res.status(404).json({ error: 'Loan not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to delete loan' });
  }
});

app.get('/api/dashboard/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const [loans, user] = await Promise.all([
      listLoans(req.user!.userId),
      getUserProfile(req.user!.userId),
    ]);

    const aggregate = aggregateLoans(loans as any);
    const monthlyIncome = Number((user as any)?.monthly_income || 0);
    const monthlyExpenses = Number((user as any)?.monthly_expenses || 0);

    return res.json({
      ...aggregate,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses),
      monthlyCashflow: monthlyIncome - monthlyExpenses,
      userId: req.user!.userId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to build dashboard summary' });
  }
});

app.post('/api/emi/calculate', (req, res) => {
  const { principal, rate, tenure } = req.body || {};
  const p = Number(principal);
  const r = Number(rate);
  const n = Number(tenure);

  if (!Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(n) || p <= 0 || n <= 0) {
    return res.status(400).json({ error: 'principal, rate, tenure required' });
  }

  const emi = calculateEmi(p, r, n);
  const interest = totalInterest(p, r, n);

  return res.json({
    emi: +emi.toFixed(2),
    totalInterest: +interest.toFixed(2),
    totalPayment: +(emi * n).toFixed(2),
  });
});

app.post('/api/emi/amortization', (req, res) => {
  const { loan } = req.body || {};
  if (!loan) return res.status(400).json({ error: 'loan required' });
  return res.json(buildAmortizationTable(loan));
});

app.post('/api/emi/aggregate', (req, res) => {
  const { loans } = req.body || {};
  if (!Array.isArray(loans)) return res.status(400).json({ error: 'loans array required' });
  return res.json(aggregateLoans(loans));
});

app.post('/api/credit-health/analyze', authenticate, upload.single('statement'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Statement file required' });

  const filename = req.file.originalname.toLowerCase();
  const isPdf = req.file.mimetype.includes('pdf') || filename.endsWith('.pdf');
  const isCsv = req.file.mimetype.includes('csv') || filename.endsWith('.csv');

  if (!isPdf && !isCsv) {
    return res.status(400).json({ error: 'Only PDF and CSV statements are supported' });
  }

  try {
    const profile = await buildStatementProfile(
      req.file.buffer,
      isPdf ? 'application/pdf' : 'text/csv'
    );

    // Member 3 can replace this implementation with the Python engine
    // without changing the frontend route contract.
    return res.json(await saveCreditReport(req.user!.userId, profile as any));
  } catch (err: any) {
    return res.status(422).json({ error: err.message || 'Unable to analyze statement' });
  }
});

<<<<<<< HEAD
app.post('/api/loan-app-detector/check', authenticate, (req, res) => {
  try {
    res.json(assessLoanApp(req.body));
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to assess loan app' });
  }
});
=======
app.get('/api/credit-health/latest', authenticate, async (req: AuthRequest, res) => {
  try {
    const report = await getLatestCreditReport(req.user!.userId);
    return report
      ? res.json(report)
      : res.status(404).json({ error: 'No credit health report found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load credit report' });
  }
});

// Reserved integration contracts for Member 4.
app.post('/api/ai/chat', authenticate, async (_req, res) => {
  return res.status(501).json({
    error: 'AI service is not configured yet. Integrate the server-side Gemini service here.',
  });
});

app.get('/api/reports/:id/download', authenticate, async (_req, res) => {
  return res.status(501).json({
    error: 'Report download is not configured yet. Add Cloud Storage signed URL generation here.',
  });
});

app.listen(PORT, () => {
  console.log('🚀 CrediMerge API running on http://localhost:' + PORT);
});
>>>>>>> 0141fbb3d2821a458eaa7041b596f07877beda35
