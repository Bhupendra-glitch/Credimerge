"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatementProfile = buildStatementProfile;
const csv_parser_1 = __importDefault(require("csv-parser"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const stream_1 = require("stream");
const money = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};
const isCredit = (value) => /credit|cr|income|deposit|salary|payment received/i.test(value);
async function parseCsv(buffer) {
    const rows = [];
    await new Promise((resolve, reject) => {
        stream_1.Readable.from(buffer)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
    });
    return rows.flatMap((row) => {
        const values = Object.entries(row);
        const get = (names) => values.find(([key]) => names.test(key))?.[1] ?? '';
        const credit = money(get(/credit|deposit|income|salary/i));
        const debit = money(get(/debit|withdraw|expense|payment/i));
        const amount = money(get(/amount|value|transaction/i));
        const type = get(/type|transaction.*kind|cr.?dr/i);
        if (credit || debit) {
            return [
                credit ? { amount: credit, type: 'credit', date: get(/date|time/i) } : null,
                debit ? { amount: debit, type: 'debit', date: get(/date|time/i) } : null,
            ].filter(Boolean);
        }
        if (!amount)
            return [];
        return [{ amount, type: isCredit(`${type} ${get(/description|narration|particular/i)}`) ? 'credit' : 'debit', date: get(/date|time/i) }];
    });
}
async function parsePdf(buffer) {
    const { text } = await (0, pdf_parse_1.default)(buffer);
    return text.split(/\r?\n/).flatMap((line) => {
        const numbers = line.match(/(?:₹|INR|Rs\.?\s*)?\d[\d,]*(?:\.\d{1,2})?/g);
        if (!numbers?.length)
            return [];
        const amount = money(numbers[numbers.length - 1]);
        if (!amount || /opening|closing|balance/i.test(line) && numbers.length < 2)
            return [];
        return [{ amount, type: isCredit(line) ? 'credit' : 'debit' }];
    });
}
async function buildStatementProfile(buffer, mimeType) {
    const transactions = mimeType.includes('pdf') ? await parsePdf(buffer) : await parseCsv(buffer);
    if (!transactions.length)
        throw new Error('No transactions found in the uploaded statement');
    const credits = transactions.filter((transaction) => transaction.type === 'credit');
    const debits = transactions.filter((transaction) => transaction.type === 'debit');
    const monthlyIncome = credits.reduce((sum, transaction) => sum + transaction.amount, 0);
    const monthlyExpenses = debits.reduce((sum, transaction) => sum + transaction.amount, 0);
    const monthlyCashflow = monthlyIncome - monthlyExpenses;
    const incomeStability = Math.max(0.3, Math.min(1, credits.length / Math.max(transactions.length, 1) * 2));
    const repaymentRate = Math.max(0, Math.min(1, 1 - debits.filter((transaction) => transaction.amount > monthlyIncome * 0.5).length / Math.max(debits.length, 1)));
    const score = Math.max(0, Math.min(100, 45 + incomeStability * 25 + repaymentRate * 20 + (monthlyCashflow > 0 ? 10 : 0)));
    return {
        monthly_income: Math.round(monthlyIncome),
        monthly_expenses: Math.round(monthlyExpenses),
        monthly_savings: Math.max(0, Math.round(monthlyCashflow)),
        monthly_cashflow: Math.round(monthlyCashflow),
        monthly_emi: 0,
        existing_debt: 0,
        active_loan_count: 0,
        repayment_rate: +repaymentRate.toFixed(3),
        missed_payments_12m: 0,
        foir_pct: 0,
        income_stability_score: +incomeStability.toFixed(3),
        cashflow_score: +score.toFixed(1),
        risk_band: score >= 70 ? 'Low Risk' : score >= 50 ? 'Moderate Risk' : 'High Risk',
        transaction_months: 1,
    };
}
