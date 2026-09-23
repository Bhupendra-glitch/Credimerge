"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("./middleware/auth");
const emiService_1 = require("./services/emiService");
const firestoreService_1 = require("./services/firestoreService");
const statementService_1 = require("./services/statementService");
const aiService_1 = require("./services/aiService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 5000);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || process.env.NODE_ENV !== 'production' || origins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'CrediMerge API', version: '2.0' });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy' });
});
app.get('/api/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await (0, firestoreService_1.getUserProfile)(req.user.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to load user' });
    }
});
// Compatibility with the current frontend.
app.get('/api/user/:id', auth_1.authenticate, async (req, res) => {
    if (req.params.id.toUpperCase() !== req.user.userId.toUpperCase()) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const user = await (0, firestoreService_1.getUserProfile)(req.user.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to load user' });
    }
});
app.get('/api/loans', auth_1.authenticate, async (req, res) => {
    try {
        return res.json(await (0, firestoreService_1.listLoans)(req.user.userId));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to load loans' });
    }
});
app.post('/api/loans', auth_1.authenticate, async (req, res) => {
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
            : (0, emiService_1.calculateEmi)(outstanding, rate, tenure);
        const loan = await (0, firestoreService_1.createLoan)(req.user.userId, {
            type,
            lender,
            outstanding,
            rate,
            tenure,
            emi: +emi.toFixed(2),
        });
        return res.status(201).json(loan);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to create loan' });
    }
});
app.get('/api/loans/:id', auth_1.authenticate, async (req, res) => {
    try {
        const loan = await (0, firestoreService_1.getLoan)(req.user.userId, req.params.id);
        return loan ? res.json(loan) : res.status(404).json({ error: 'Loan not found' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to load loan' });
    }
});
app.put('/api/loans/:id', auth_1.authenticate, async (req, res) => {
    const allowed = ['type', 'lender', 'outstanding', 'rate', 'tenure', 'emi'];
    const updates = {};
    for (const key of allowed) {
        if (req.body?.[key] !== undefined)
            updates[key] = req.body[key];
    }
    if ('outstanding' in updates)
        updates.outstanding = Number(updates.outstanding);
    if ('rate' in updates)
        updates.rate = Number(updates.rate);
    if ('tenure' in updates)
        updates.tenure = Number(updates.tenure);
    if ('emi' in updates)
        updates.emi = Number(updates.emi);
    try {
        const existing = await (0, firestoreService_1.getLoan)(req.user.userId, req.params.id);
        if (!existing)
            return res.status(404).json({ error: 'Loan not found' });
        const merged = { ...existing, ...updates };
        if (!('emi' in updates) &&
            (updates.outstanding !== undefined || updates.rate !== undefined || updates.tenure !== undefined)) {
            updates.emi = +(0, emiService_1.calculateEmi)(Number(merged.outstanding), Number(merged.rate), Number(merged.tenure)).toFixed(2);
        }
        return res.json(await (0, firestoreService_1.updateLoan)(req.user.userId, req.params.id, updates));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to update loan' });
    }
});
app.delete('/api/loans/:id', auth_1.authenticate, async (req, res) => {
    try {
        const ok = await (0, firestoreService_1.deleteLoan)(req.user.userId, req.params.id);
        return ok ? res.json({ message: 'Loan deleted' }) : res.status(404).json({ error: 'Loan not found' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to delete loan' });
    }
});
app.get('/api/dashboard/summary', auth_1.authenticate, async (req, res) => {
    try {
        const [loans, user] = await Promise.all([
            (0, firestoreService_1.listLoans)(req.user.userId),
            (0, firestoreService_1.getUserProfile)(req.user.userId),
        ]);
        const aggregate = (0, emiService_1.aggregateLoans)(loans);
        const monthlyIncome = Number(user?.monthly_income || 0);
        const monthlyExpenses = Number(user?.monthly_expenses || 0);
        return res.json({
            ...aggregate,
            monthlyIncome,
            monthlyExpenses,
            monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses),
            monthlyCashflow: monthlyIncome - monthlyExpenses,
            userId: req.user.userId,
        });
    }
    catch (err) {
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
    const emi = (0, emiService_1.calculateEmi)(p, r, n);
    const interest = (0, emiService_1.totalInterest)(p, r, n);
    return res.json({
        emi: +emi.toFixed(2),
        totalInterest: +interest.toFixed(2),
        totalPayment: +(emi * n).toFixed(2),
    });
});
app.post('/api/emi/amortization', (req, res) => {
    const { loan } = req.body || {};
    if (!loan)
        return res.status(400).json({ error: 'loan required' });
    return res.json((0, emiService_1.buildAmortizationTable)(loan));
});
app.post('/api/emi/aggregate', (req, res) => {
    const { loans } = req.body || {};
    if (!Array.isArray(loans))
        return res.status(400).json({ error: 'loans array required' });
    return res.json((0, emiService_1.aggregateLoans)(loans));
});
app.post('/api/credit-health/analyze', auth_1.authenticate, upload.single('statement'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'Statement file required' });
    const filename = req.file.originalname.toLowerCase();
    const isPdf = req.file.mimetype.includes('pdf') || filename.endsWith('.pdf');
    const isCsv = req.file.mimetype.includes('csv') || filename.endsWith('.csv');
    if (!isPdf && !isCsv) {
        return res.status(400).json({ error: 'Only PDF and CSV statements are supported' });
    }
    try {
        const profile = await (0, statementService_1.buildStatementProfile)(req.file.buffer, isPdf ? 'application/pdf' : 'text/csv');
        // The analysis result is useful even when Firestore is unavailable locally.
        // Do not turn a successful file parse into an upload failure just because
        // persistence is not configured in the current environment.
        try {
            return res.json(await (0, firestoreService_1.saveCreditReport)(req.user.userId, profile));
        }
        catch (persistenceError) {
            console.warn('Credit report analyzed but could not be persisted; returning the result:', persistenceError instanceof Error ? persistenceError.message : persistenceError);
            return res.json({ ...profile, persisted: false });
        }
    }
    catch (err) {
        return res.status(422).json({ error: err.message || 'Unable to analyze statement' });
    }
});
app.get('/api/credit-health/latest', auth_1.authenticate, async (req, res) => {
    try {
        const report = await (0, firestoreService_1.getLatestCreditReport)(req.user.userId);
        return report
            ? res.json(report)
            : res.status(404).json({ error: 'No credit health report found' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Unable to load credit report' });
    }
});
app.post('/api/ai/chat', auth_1.authenticate, async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message)
        return res.status(400).json({ error: 'Message is required' });
    try {
        const answer = await (0, aiService_1.generateFinancialAdvice)(req.user.userId, message);
        return res.json({ text: answer, answer });
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to generate AI response';
        const status = errorMessage.includes('GEMINI_API_KEY') ? 503 : 502;
        return res.status(status).json({ error: errorMessage });
    }
});
app.get('/api/reports/:id/download', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({
        error: 'Report download is not configured yet. Add Cloud Storage signed URL generation here.',
    });
});
app.listen(PORT, () => {
    console.log('🚀 CrediMerge API running on http://localhost:' + PORT);
});
