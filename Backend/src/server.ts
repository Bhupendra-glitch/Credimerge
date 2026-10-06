import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { authenticate, AuthRequest } from './middleware/auth';
import { changePassword, login, requestPasswordReset, resetPassword } from './services/authService';
import { calculateEmi, totalInterest, buildAmortizationTable, aggregateLoans } from './services/emiService';
import {
  getUserProfile,
  updateUserProfile,
  listLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  saveCreditReport,
  getLatestCreditReport,
} from './services/firestoreService';
import { buildStatementProfile } from './services/statementService';
import { askGemini } from './services/geminiService';

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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production' || origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'CrediMerge API', version: '2.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.post(['/api/login', '/api/auth/login'], async (req, res) => {
  try {
    const { userId, email, password } = req.body || {};
    const identifier = typeof email === 'string' ? email : userId;
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
      return res.status(400).json({ error: 'Email/User ID and password are required.' });
    }

    return res.json(await login(identifier.trim(), password));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid email/')) {
      return res.status(401).json({ error: error.message });
    }

    const detail = error instanceof Error ? error.message.toLowerCase() : '';
    const firebaseConfigError = [
      'firebase admin is not configured',
      'firebase service-account file',
      'default credentials',
      'could not load the default credentials',
    ].some((indicator) => detail.includes(indicator));
    console.error('Login failed:', error);
    return res.status(503).json({
      error: firebaseConfigError
        ? 'Firebase authentication is not configured. Add Backend/credentials/firebase-service-account.json and restart the backend.'
        : 'Login is temporarily unavailable. Please try again.',
    });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const message = await requestPasswordReset(email);
    return res.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Enter a valid email address.') {
      return res.status(400).json({ error: message });
    }
    console.error('Password reset request failed:', error);
    return res.status(503).json({
      error: message.startsWith('Password reset email is not configured.')
        ? message
        : 'Unable to process the reset request right now. Please try again.',
    });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body || {};
  if ([token, newPassword, confirmPassword].some((value) => typeof value !== 'string')) {
    return res.status(400).json({ error: 'Reset link, new password and confirmation are required.' });
  }

  try {
    await resetPassword(token, newPassword, confirmPassword);
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reset password.';
    console.error('Password reset failed:', error);
    return res.status(400).json({ error: message });
  }
});

app.post('/api/ai/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    const userId = req.user!.userId;

    const user = (await getUserProfile(userId)) as Record<string, any> | null;
    const loans = await listLoans(userId);

    let creditHealth: Record<string, any> | null = null;

    try {
      creditHealth = await getLatestCreditReport(userId);
    } catch (error) {
      console.warn('Credit health unavailable:', error);
    }

    const dashboard = {
      monthlyIncome: user?.monthly_income,
      monthlyEMI: user?.monthly_emi,
      existingDebt: user?.existing_debt,
      monthlyCashflow: user?.monthly_cashflow,
      activeLoanCount: user?.active_loan_count,
      cashflowScore: user?.cashflow_score,
      riskBand: user?.risk_band,
    };

    try {
      const reply = await askGemini(message, {
        user,
        loans,
        dashboard,
        creditHealth,
      });

      return res.json({
        reply,
        sources: ['gemini', 'dashboard', 'loans', 'credit-health'],
      });
    } catch (geminiError) {
      console.warn(
        'Gemini unavailable; using local CrediMerge fallback:',
        geminiError instanceof Error ? geminiError.message : geminiError
      );

      const q = message.toLowerCase();

      let reply = '';

      if (q.includes('emi')) {
        reply = `Your total monthly EMI is ₹${Number(
          user?.monthly_emi || 0
        ).toLocaleString('en-IN')}. You currently have ${
          user?.active_loan_count || loans.length
        } active loans.`;
      } else if (q.includes('loan') || q.includes('debt')) {
        reply = `You currently have ${
          user?.active_loan_count || loans.length
        } active loans with total outstanding debt of ₹${Number(
          user?.existing_debt || 0
        ).toLocaleString('en-IN')}.`;
      } else if (q.includes('income')) {
        reply = `Your monthly income is ₹${Number(
          user?.monthly_income || 0
        ).toLocaleString('en-IN')}.`;
      } else if (q.includes('credit') || q.includes('score') || q.includes('health')) {
        if (user?.cashflow_score != null) {
          reply = `Your CrediMerge credit health score is ${user.cashflow_score}/100, with a risk band of ${user.risk_band || 'unavailable'}. This is a CrediMerge cash-flow-based estimate, not an official bureau score.`;
        } else {
          reply = 'Your credit health information is currently unavailable.';
        }
      } else if (q.includes('consolidat')) {
        reply = `You have ₹${Number(
          user?.existing_debt || 0
        ).toLocaleString('en-IN')} in outstanding debt. Consolidation may reduce monthly EMI, but it can also increase total interest if the new tenure is longer. Compare the total repayment before deciding.`;
      } else {
        reply =
          'The live AI service is currently unavailable, but I can still explain your EMI, loans, debt, income, and CrediMerge credit-health information.';
      }

      return res.json({
        reply,
        sources: ['local-fallback', 'dashboard', 'loans'],
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);

    return res.status(500).json({
      error: 'Unable to process your question right now.',
    });
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

app.patch('/api/me/profile', authenticate, async (req: AuthRequest, res) => {
  const fullName = typeof req.body?.fullName === 'string'
    ? req.body.fullName.trim().replace(/\s+/g, ' ')
    : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const phoneDigits = phone.replace(/\D/g, '');

  if (!fullName || fullName.length > 100 || /[\u0000-\u001f\u007f]/.test(fullName)) {
    return res.status(400).json({ error: 'Enter a valid name up to 100 characters.' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (phone && (!/^\+?[0-9().\s-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
    return res.status(400).json({ error: 'Enter a valid phone number with 7-15 digits.' });
  }

  try {
    const user = await updateUserProfile(req.user!.userId, { fullName, email, phone });
    if (!user) return res.status(404).json({ error: 'Profile updates are unavailable for demo accounts.' });
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to save profile.' });
  }
});

app.post('/api/me/password', authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if ([currentPassword, newPassword, confirmPassword].some((value) => typeof value !== 'string')) {
    return res.status(400).json({ error: 'Complete all password fields.' });
  }

  try {
    await changePassword(req.user!.userId, currentPassword, newPassword, confirmPassword);
    return res.json({ message: 'Password updated successfully.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to change password.' });
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

    // The analysis result is useful even when Firestore is unavailable locally.
    // Do not turn a successful file parse into an upload failure just because
    // persistence is not configured in the current environment.
    try {
      return res.json(await saveCreditReport(req.user!.userId, profile as any));
    } catch (persistenceError) {
      console.warn(
        'Credit report analyzed but could not be persisted; returning the result:',
        persistenceError instanceof Error ? persistenceError.message : persistenceError,
      );
      return res.json({ ...profile, persisted: false });
    }
  } catch (err: any) {
    return res.status(422).json({ error: err.message || 'Unable to analyze statement' });
  }
});

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

app.get('/api/reports/:id/download', authenticate, async (_req: AuthRequest, res) => {
  return res.status(501).json({
    error: 'Report download is not configured yet. Add Cloud Storage signed URL generation here.',
  });
});

app.listen(PORT, () => {
  console.log('🚀 CrediMerge API running on http://localhost:' + PORT);
});
