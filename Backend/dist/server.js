"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authService_1 = require("./services/authService");
const csvService_1 = require("./services/csvService");
const auth_1 = require("./middleware/auth");
const emiService_1 = require("./services/emiService");
const multer_1 = __importDefault(require("multer"));
const statementService_1 = require("./services/statementService");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const PORT = process.env.PORT || 5000;
// Health
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'CrediMerge API', users: (0, csvService_1.loadUsers)().length });
});
// ---------- AUTH ----------
app.post('/api/login', (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ error: 'User ID and password required' });
    }
    try {
        const result = (0, authService_1.login)(userId.trim().toUpperCase(), password);
        res.json(result);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
});
// ---------- USER ----------
app.get('/api/user/:id', auth_1.authenticate, (req, res) => {
    const user = (0, csvService_1.findUser)(req.params.id);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json((0, csvService_1.getSafeUser)(user));
});
// ---------- EMI CALCULATIONS ----------
app.post('/api/emi/calculate', (req, res) => {
    const { principal, rate, tenure } = req.body;
    if (!principal || !rate || !tenure) {
        return res.status(400).json({ error: 'principal, rate, tenure required' });
    }
    const emi = (0, emiService_1.calculateEmi)(principal, rate, tenure);
    const interest = (0, emiService_1.totalInterest)(principal, rate, tenure);
    res.json({
        emi: +emi.toFixed(2),
        totalInterest: +interest.toFixed(2),
        totalPayment: +(emi * tenure).toFixed(2),
    });
});
app.post('/api/emi/amortization', (req, res) => {
    const { loan } = req.body;
    if (!loan)
        return res.status(400).json({ error: 'loan required' });
    res.json((0, emiService_1.buildAmortizationTable)(loan));
});
app.post('/api/emi/aggregate', (req, res) => {
    const { loans } = req.body;
    if (!Array.isArray(loans))
        return res.status(400).json({ error: 'loans array required' });
    res.json((0, emiService_1.aggregateLoans)(loans));
});
// ---------- START ----------
app.listen(PORT, () => {
    console.log(`🚀 CrediMerge API running on http://localhost:${PORT}`);
    console.log(`📊 Loaded ${(0, csvService_1.loadUsers)().length} users from CSV`);
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
        res.json(await (0, statementService_1.buildStatementProfile)(req.file.buffer, isPdf ? 'application/pdf' : 'text/csv'));
    }
    catch (err) {
        res.status(422).json({ error: err.message || 'Unable to analyze statement' });
    }
});
