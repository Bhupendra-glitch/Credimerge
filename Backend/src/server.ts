import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { authenticate, AuthRequest } from './middleware/auth';
import {
  changePassword,
  login,
  requestPasswordReset,
  resetPassword,
  registerUser,
  verifyEmailCode,
  resendVerificationCode,
  googleLogin,
} from './services/authService';
import { calculateEmi, totalInterest, buildAmortizationTable, aggregateLoans } from './services/emiService';
import {
  getUserProfile,
  updateUserProfile,
  updateUserPhoto,
  listLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  saveCreditReport,
  getLatestCreditReport,
} from './services/supabaseService';
import { buildStatementProfile } from './services/statementService';
import { askGemini } from './services/geminiService';
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
  updateTransactionCategory,
  deleteTransaction,
  listLinkedAccounts,
  TransactionCategory,
  TransactionType,
} from './services/transactionService';
import {
  createConsentRequest,
  getUserConsent,
  revokeConsent,
  connectSandboxAccount,
  syncAccount,
  verifyWebhookSignature,
  processWebhookTransactions,
} from './services/financialProviderService';
import {
  generateAttestationQuote,
  computeConfidentialRisk,
} from './services/teeService';
import { analyzeTransactionInsights } from './services/transactionAdvisorService';
import { memoryCache } from './services/cacheService';
import { standardRateLimiter, strictRateLimiter } from './middleware/rateLimiter';
import {
  transcribeWithElevenLabs,
  synthesizeWithElevenLabs,
  isElevenLabsAvailable,
} from './services/elevenLabsService';
import {
  initTigerDatabase,
  testTigerConnection,
  isTigerConfigured,
} from './config/tigerData';
import {
  insertFinancialTransaction,
  getFinancialTransactions,
  getCashFlow,
  getIncomeHistory,
  getExpenseHistory,
  getBalanceHistory,
  getForecastingData,
} from './services/tigerDataService';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => {
    const trimmed = value.trim();
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  })
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const normalized = origin.replace(/\/+$/, '');
    if (origins.includes(normalized) || origins.some((o) => normalized.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(standardRateLimiter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'CrediMerge API', version: '2.0' });
});

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'healthy' });
});

// GET /api/health/tiger - Safe Tiger Data health status (never exposes secrets or connection strings)
app.get('/api/health/tiger', async (_req, res) => {
  try {
    if (!isTigerConfigured()) {
      return res.status(503).json({
        success: false,
        service: 'tiger-data',
        database: 'disconnected',
      });
    }

    const connected = await testTigerConnection();
    if (connected) {
      return res.json({
        success: true,
        service: 'tiger-data',
        database: 'connected',
      });
    } else {
      return res.status(503).json({
        success: false,
        service: 'tiger-data',
        database: 'disconnected',
      });
    }
  } catch {
    return res.status(503).json({
      success: false,
      service: 'tiger-data',
      database: 'disconnected',
    });
  }
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
    const dbConfigError = [
      'firebase',
      'supabase',
      'not configured',
      'default credentials',
      'unable to detect a project id',
    ].some((indicator) => detail.includes(indicator));
    console.error('Login failed:', error);
    return res.status(503).json({
      error: dbConfigError
        ? 'Database is not configured yet. Configure Supabase credentials in Backend/.env and restart the backend.'
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
    const result = await requestPasswordReset(email);
    return res.json(typeof result === 'string' ? { message: result } : result);
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, workerType } = req.body || {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    const result = await registerUser({ email, password, fullName, workerType });
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Registration failed:', error);
    return res.status(400).json({ error: error.message || 'Registration failed.' });
  }
});

app.post(['/api/auth/verify-email', '/api/auth/verify-code'], async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }
    const result = await verifyEmailCode(email, code);
    return res.json(result);
  } catch (error: any) {
    console.error('Email verification failed:', error);
    return res.status(400).json({ error: error.message || 'Verification failed.' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const result = await resendVerificationCode(email);
    return res.json(result);
  } catch (error: any) {
    console.error('Resend verification failed:', error);
    return res.status(400).json({ error: error.message || 'Unable to resend code.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, picture, credential } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }
    const result = await googleLogin({ email, name, picture, credential });
    return res.json(result);
  } catch (error: any) {
    console.error('Google login failed:', error);
    return res.status(400).json({ error: error.message || 'Google sign-in failed.' });
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

app.patch('/api/me/photo', authenticate, async (req: AuthRequest, res) => {
  const profilePhoto = req.body?.profilePhoto;
  if (profilePhoto !== null && typeof profilePhoto !== 'string') {
    return res.status(400).json({ error: 'Choose a valid profile photo.' });
  }
  if (typeof profilePhoto === 'string') {
    const imageData = profilePhoto.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!imageData || imageData[1].length > 550_000) {
      return res.status(400).json({ error: 'Profile photos must be JPEG images under 400 KB.' });
    }
    const imageBytes = Buffer.from(imageData[1], 'base64');
    if (imageBytes.length > 400 * 1024 || imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8 || imageBytes[2] !== 0xff) {
      return res.status(400).json({ error: 'Profile photos must be valid JPEG images under 400 KB.' });
    }
  }

  try {
    const user = await updateUserPhoto(req.user!.userId, profilePhoto);
    if (!user) return res.status(404).json({ error: 'Profile photo updates are unavailable for demo accounts.' });
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to save profile photo.' });
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

// ==========================================
// 1. REAL-TIME TRANSACTIONS ENDPOINTS
// ==========================================

// GET /api/transactions - Retrieve user's transactions with search, filters, pagination
app.get('/api/transactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      type,
      category,
      status,
      source,
      search,
      startDate,
      endDate,
      accountId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filter = {
      type: type as any,
      category: category as any,
      status: status as any,
      source: source as any,
      search: typeof search === 'string' ? search : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      accountId: typeof accountId === 'string' ? accountId : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    const result = await getTransactions(userId, filter);
    return res.json(result);
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ error: err.message || 'Unable to load transactions' });
  }
});

// GET /api/transactions/summary - Retrieve credit/debit totals, cashflow, category breakdown (cached)
app.get('/api/transactions/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const cacheKey = `user:${userId}:summary`;
    const cached = memoryCache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const summary = await getTransactionSummary(userId);
    memoryCache.set(cacheKey, summary, 60); // 60s TTL
    return res.json({ ...summary, cached: false });
  } catch (err: any) {
    console.error('Error fetching transaction summary:', err);
    return res.status(500).json({ error: err.message || 'Unable to build transaction summary' });
  }
});

// POST /api/transactions - Create a manual or imported transaction
app.post('/api/transactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      accountId,
      type,
      amount,
      category,
      description,
      merchantName,
      transactionDate,
      status,
      source,
      referenceNumber,
    } = req.body || {};

    if (!type || !amount || !description) {
      return res.status(400).json({ error: 'type, amount, and description are required' });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    if (type !== 'CREDIT' && type !== 'DEBIT') {
      return res.status(400).json({ error: 'type must be CREDIT or DEBIT' });
    }

    const result = await createTransaction(userId, {
      accountId,
      type: type as TransactionType,
      amount: numAmount,
      category: category as TransactionCategory,
      description: String(description).trim(),
      merchantName: merchantName ? String(merchantName).trim() : null,
      transactionDate: transactionDate || new Date().toISOString(),
      status,
      source: source || 'MANUAL',
      referenceNumber,
      isUserConfirmedCategory: Boolean(category),
    });

    memoryCache.invalidateUser(userId);
    return res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (err: any) {
    console.error('Error creating transaction:', err);
    return res.status(500).json({ error: err.message || 'Unable to save transaction' });
  }
});

// PATCH /api/transactions/:id/category - Update or confirm category
app.patch('/api/transactions/:id/category', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { category } = req.body || {};

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Valid category string is required' });
    }

    const updated = await updateTransactionCategory(userId, req.params.id, category as TransactionCategory);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });

    memoryCache.invalidateUser(userId);
    return res.json(updated);
  } catch (err: any) {
    console.error('Error updating transaction category:', err);
    return res.status(500).json({ error: err.message || 'Unable to update category' });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
app.delete('/api/transactions/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const success = await deleteTransaction(userId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });

    memoryCache.invalidateUser(userId);
    return res.json({ message: 'Transaction removed successfully' });
  } catch (err: any) {
    console.error('Error deleting transaction:', err);
    return res.status(500).json({ error: err.message || 'Unable to delete transaction' });
  }
});

// ==========================================
// 2. FINANCIAL DATA / ACCOUNT AGGREGATOR ENDPOINTS
// ==========================================

// GET /api/accounts - List linked accounts
app.get('/api/accounts', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const accounts = await listLinkedAccounts(userId);
    return res.json(accounts);
  } catch (err: any) {
    console.error('Error loading accounts:', err);
    return res.status(500).json({ error: err.message || 'Unable to load accounts' });
  }
});

// POST /api/accounts/connect-sandbox - Connect a realistic sandbox bank account
app.post('/api/accounts/connect-sandbox', authenticate, strictRateLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { institutionName } = req.body || {};

    const validInstitutions = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank'];
    const inst = validInstitutions.includes(institutionName) ? institutionName : 'HDFC Bank';

    const result = await connectSandboxAccount(userId, inst);
    memoryCache.invalidateUser(userId);

    return res.status(201).json({
      message: `Successfully connected sandbox account for ${inst}. Initial transactions populated.`,
      account: result.account,
      transactionsCount: result.transactions.length,
      disclaimer: 'Notice: These are synthetic sandbox transactions for testing and simulation. They do not represent real banking balances.',
    });
  } catch (err: any) {
    console.error('Error connecting sandbox account:', err);
    return res.status(500).json({ error: err.message || 'Unable to connect account' });
  }
});

// POST /api/accounts/sync - Synchronize account transactions
app.post('/api/accounts/sync', authenticate, strictRateLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const result = await syncAccount(userId, accountId);
    memoryCache.invalidateUser(userId);

    return res.json({
      message: 'Account synchronized successfully',
      ...result,
    });
  } catch (err: any) {
    console.error('Error syncing account:', err);
    const isConsentErr = err.message && err.message.includes('CONSENT_EXPIRED');
    return res.status(isConsentErr ? 403 : 500).json({
      error: err.message || 'Unable to sync account transactions',
      code: isConsentErr ? 'CONSENT_EXPIRED' : 'SYNC_FAILED',
    });
  }
});

// GET /api/accounts/consent - Get active user consent
app.get('/api/accounts/consent', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const consent = await getUserConsent(userId);
    return res.json(consent || { status: 'NONE' });
  } catch (err: any) {
    console.error('Error getting consent:', err);
    return res.status(500).json({ error: err.message || 'Unable to check consent' });
  }
});

// POST /api/accounts/consent - Create or renew consent
app.post('/api/accounts/consent', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { handle, provider, scopes, validityDays } = req.body || {};

    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Account Aggregator handle is required (e.g. mobile@aa)' });
    }

    const consent = await createConsentRequest(userId, {
      handle,
      provider: provider || 'SANDBOX_AA',
      scopes,
      validityDays,
    });

    return res.status(201).json(consent);
  } catch (err: any) {
    console.error('Error creating consent:', err);
    return res.status(500).json({ error: err.message || 'Unable to create consent' });
  }
});

// POST /api/accounts/consent/revoke - Revoke consent
app.post('/api/accounts/consent/revoke', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { consentId } = req.body || {};

    if (!consentId) return res.status(400).json({ error: 'consentId is required' });

    await revokeConsent(userId, consentId);
    return res.json({ message: 'Consent successfully revoked. No further automated fetches will occur.' });
  } catch (err: any) {
    console.error('Error revoking consent:', err);
    return res.status(500).json({ error: err.message || 'Unable to revoke consent' });
  }
});

// POST /api/webhooks/transactions - Verified provider notification webhook
app.post('/api/webhooks/transactions', strictRateLimiter, async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payloadStr = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payloadStr, signature)) {
    return res.status(401).json({ error: 'Invalid or missing webhook signature' });
  }

  try {
    const { userId, accountId, transactions } = req.body || {};
    if (!userId || !accountId || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'userId, accountId, and transactions array required' });
    }

    const result = await processWebhookTransactions(userId, accountId, transactions);
    memoryCache.invalidateUser(userId);

    return res.json({ status: 'PROCESSED', ...result });
  } catch (err: any) {
    console.error('Webhook processing failure:', err);
    return res.status(500).json({ error: err.message || 'Internal webhook processing error' });
  }
});

// ==========================================
// 3. TRANSACTION ADVISOR INSIGHTS
// ==========================================

// GET /api/advisor/transaction-insights - Connects transaction patterns to loan consolidation
app.get('/api/advisor/transaction-insights', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const cacheKey = `user:${userId}:advisor_insights`;
    const cached = memoryCache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const insights = await analyzeTransactionInsights(userId);
    memoryCache.set(cacheKey, insights, 60);

    return res.json(insights);
  } catch (err: any) {
    console.error('Error generating advisor insights:', err);
    return res.status(500).json({ error: err.message || 'Unable to generate advisor insights' });
  }
});

// ==========================================
// 4. TRUSTED EXECUTION ENVIRONMENT (TEE) ENDPOINTS
// ==========================================

// GET /api/tee/attestation - Remote attestation quote
app.get('/api/tee/attestation', async (req, res) => {
  try {
    const nonce = typeof req.query.nonce === 'string' ? req.query.nonce : undefined;
    const quote = await generateAttestationQuote(nonce || '');
    return res.json(quote);
  } catch (err: any) {
    console.error('Attestation generation failure:', err);
    return res.status(500).json({ error: 'Unable to generate enclave attestation' });
  }
});

// POST /api/tee/compute-risk - Run confidential risk computation inside enclave
app.post('/api/tee/compute-risk', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [user, loans, summary] = await Promise.all([
      getUserProfile(userId),
      listLoans(userId),
      getTransactionSummary(userId),
    ]);

    const result = await computeConfidentialRisk(userId, {
      monthlyIncome: Number((user as any)?.monthly_income || 0),
      monthlyExpenses: Number((user as any)?.monthly_expenses || 0),
      loans: loans as any,
      transactionCredits30d: summary.totalCredits,
      transactionDebits30d: summary.totalDebits,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Confidential computation error:', err);
    return res.status(500).json({ error: err.message || 'Confidential computation failure' });
  }
});

// ==========================================
// 5. ELEVENLABS VOICE ASSISTANT ENDPOINTS
// ==========================================

// GET /api/voice/status - Check voice configuration status
app.get('/api/voice/status', (_req, res) => {
  return res.json({
    elevenLabsConfigured: isElevenLabsAvailable(),
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    features: {
      speechToText: true,
      textToSpeech: true,
      browserFallback: true,
    },
  });
});

// POST /api/voice/stt - Transcribe microphone audio using ElevenLabs Scribe
app.post('/api/voice/stt', authenticate, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Audio file is required for transcription' });
    }

    const result = await transcribeWithElevenLabs(
      req.file.buffer,
      req.file.originalname || 'voice.webm',
      req.file.mimetype || 'audio/webm'
    );

    return res.json(result);
  } catch (err: any) {
    console.error('STT endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Speech-to-text transcription failed' });
  }
});

// POST /api/voice/tts - Synthesize text to speech using ElevenLabs
app.post('/api/voice/tts', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text, voiceId } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const ttsResult = await synthesizeWithElevenLabs(text, voiceId);
    if (!ttsResult) {
      return res.json({
        fallback: true,
        message: 'ElevenLabs TTS unavailable. Use browser speech synthesis.',
      });
    }

    return res.json(ttsResult);
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Text-to-speech synthesis failed' });
  }
});

// POST /api/voice/chat - End-to-end Voice Chat (Audio/Text in -> ElevenLabs STT -> AI Financial Intelligence -> TTS out)
app.post('/api/voice/chat', authenticate, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    let questionText = (req.body?.text || '').trim();

    // 1. If audio file was uploaded, transcribe with ElevenLabs Scribe
    if (req.file && req.file.buffer) {
      try {
        const stt = await transcribeWithElevenLabs(
          req.file.buffer,
          req.file.originalname || 'query.webm',
          req.file.mimetype || 'audio/webm'
        );
        questionText = stt.text;
      } catch (sttErr: any) {
        console.warn('ElevenLabs STT error in voice chat:', sttErr.message);
        return res.status(422).json({
          error: 'Could not transcribe speech. Please speak clearly or type your question.',
        });
      }
    }

    if (!questionText) {
      return res.status(400).json({ error: 'No audio or text question received' });
    }

    // 2. Fetch user's financial profile & loans context for accurate answers
    const [user, loans] = await Promise.all([
      getUserProfile(userId),
      listLoans(userId),
    ]);

    let creditHealth = null;
    try {
      creditHealth = await getLatestCreditReport(userId);
    } catch {
      // optional
    }

    const dashboard = {
      monthlyIncome: (user as any)?.monthly_income,
      monthlyEMI: (user as any)?.monthly_emi,
      existingDebt: (user as any)?.existing_debt,
      monthlyCashflow: (user as any)?.monthly_cashflow,
      activeLoanCount: (user as any)?.active_loan_count,
      cashflowScore: (user as any)?.cashflow_score,
      riskBand: (user as any)?.risk_band,
    };

    // 3. Generate response using AI / financial intelligence
    let reply = '';
    try {
      reply = await askGemini(questionText, {
        user,
        loans,
        dashboard,
        creditHealth,
      });
    } catch {
      // Local financial intelligence fallback
      const q = questionText.toLowerCase();
      const emi = Number((user as any)?.monthly_emi || 0).toLocaleString('en-IN');
      const debt = Number((user as any)?.existing_debt || 0).toLocaleString('en-IN');
      const income = Number((user as any)?.monthly_income || 0).toLocaleString('en-IN');
      const surplus = Number((user as any)?.monthly_cashflow || 0).toLocaleString('en-IN');

      if (q.includes('emi')) {
        reply = `Your total monthly EMI is ₹${emi}. Your available monthly cash flow surplus is ₹${surplus}.`;
      } else if (q.includes('debt') || q.includes('loan')) {
        reply = `You currently have ${loans.length} loans with total outstanding debt of ₹${debt}.`;
      } else if (q.includes('income')) {
        reply = `Your monthly income is ₹${income}, with an estimated surplus of ₹${surplus}.`;
      } else {
        reply = `Based on your profile, your monthly EMI is ₹${emi} and total debt is ₹${debt}. Consolidation can help reduce monthly payment pressure.`;
      }
    }

    // 4. Synthesize voice with ElevenLabs (with graceful client fallback)
    const ttsResult = await synthesizeWithElevenLabs(reply);

    return res.json({
      transcript: questionText,
      reply,
      audioBase64: ttsResult?.audioBase64 || null,
      ttsEngine: ttsResult ? 'elevenlabs' : 'web_speech',
      voiceId: ttsResult?.voiceId || null,
    });
  } catch (err: any) {
    console.error('Voice chat error:', err);
    return res.status(500).json({ error: err.message || 'Voice assistant error' });
  }
});

// ==========================================
// 6. TIGER DATA (TIMESCALE DB) FINANCIAL TIME-SERIES ENDPOINTS
// ==========================================

function isAuthorizedFinancialUser(req: AuthRequest, targetUserId: string): boolean {
  if (!req.user || !req.user.userId) return false;
  const current = req.user.userId.trim().toUpperCase();
  const target = targetUserId.trim().toUpperCase();
  return current === target || current === 'ADMIN';
}

// GET /api/financial/transactions/:userId - Retrieve high-volume transactions from Tiger Data
app.get('/api/financial/transactions/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const { limit, offset, transactionType, category, startDate, endDate } = req.query;
    const result = await getFinancialTransactions(targetUserId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      transactionType: typeof transactionType === 'string' ? transactionType : undefined,
      category: typeof category === 'string' ? category : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    return res.json({
      success: true,
      data: result.transactions,
      totalCount: result.totalCount,
    });
  } catch (err: any) {
    console.error('Tiger Data transaction query error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to load transactions' });
  }
});

// POST /api/financial/transactions - Insert financial transaction into Tiger Data hypertable
app.post('/api/financial/transactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.userId;
    const {
      userId,
      transactionId,
      time,
      transactionType,
      category,
      amount,
      balance,
      description,
      source,
    } = req.body || {};

    const targetUserId = userId || currentUserId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cannot create transactions for another user',
      });
    }

    if (!transactionType || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'transactionType and amount are required',
      });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    const normType = String(transactionType).toUpperCase();
    if (!['CREDIT', 'DEBIT', 'TRANSFER'].includes(normType)) {
      return res.status(400).json({
        success: false,
        error: 'transactionType must be CREDIT, DEBIT, or TRANSFER',
      });
    }

    const tx = await insertFinancialTransaction({
      userId: targetUserId,
      transactionId,
      time,
      transactionType: normType as 'CREDIT' | 'DEBIT' | 'TRANSFER',
      category: category ? String(category).trim() : 'OTHER',
      amount: numAmount,
      balance: balance !== undefined && balance !== null ? Number(balance) : null,
      description: description ? String(description).trim() : 'Transaction',
      source: source || 'MANUAL',
    });

    return res.status(201).json({
      success: true,
      data: tx,
    });
  } catch (err: any) {
    console.error('Tiger Data transaction insert error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to record transaction' });
  }
});

// GET /api/financial/cashflow/:userId - Daily, weekly, or monthly cash flow time-series
app.get('/api/financial/cashflow/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const interval = (req.query.interval === 'month' || req.query.interval === 'week')
      ? req.query.interval
      : 'day';

    const cashFlow = await getCashFlow(targetUserId, interval);
    return res.json({
      success: true,
      data: cashFlow,
    });
  } catch (err: any) {
    console.error('Tiger Data cashflow error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to calculate cash flow' });
  }
});

// GET /api/financial/income/:userId - Income history time-series
app.get('/api/financial/income/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const income = await getIncomeHistory(targetUserId);
    return res.json({
      success: true,
      data: income,
    });
  } catch (err: any) {
    console.error('Tiger Data income history error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to load income history' });
  }
});

// GET /api/financial/expenses/:userId - Expense history time-series
app.get('/api/financial/expenses/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const expenses = await getExpenseHistory(targetUserId);
    return res.json({
      success: true,
      data: expenses,
    });
  } catch (err: any) {
    console.error('Tiger Data expense history error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to load expense history' });
  }
});

// GET /api/financial/balance/:userId - Balance history and trends
app.get('/api/financial/balance/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const balances = await getBalanceHistory(targetUserId);
    return res.json({
      success: true,
      data: balances,
    });
  } catch (err: any) {
    console.error('Tiger Data balance history error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to load balance history' });
  }
});

// GET /api/financial/forecast/:userId - 30/60/90 day forecasts & financial risk calculations
app.get('/api/financial/forecast/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!isAuthorizedFinancialUser(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own financial data',
      });
    }

    const forecast = await getForecastingData(targetUserId);
    return res.json({
      success: true,
      data: forecast,
    });
  } catch (err: any) {
    console.error('Tiger Data forecast calculation error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unable to generate financial forecast' });
  }
});

app.listen(PORT, async () => {
  console.log('🚀 CrediMerge API running on http://localhost:' + PORT);
  try {
    await initTigerDatabase();
  } catch (err: any) {
    console.warn('Tiger Data initialization check:', err.message);
  }
});

