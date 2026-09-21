import csvParser from 'csv-parser';
import pdfParse from 'pdf-parse';
import { Readable } from 'stream';

export interface StatementProfile {
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  monthly_cashflow: number;
  monthly_emi: number;
  existing_debt: number;
  active_loan_count: number;
  repayment_rate: number;
  missed_payments_12m: number;
  foir_pct: number;
  income_stability_score: number;
  cashflow_score: number;
  risk_band: string;
  transaction_months: number;
}

interface Transaction {
  amount: number;
  type: 'credit' | 'debit';
  date?: string;
}

const money = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

const isCredit = (value: string) => /credit|cr|income|deposit|salary|payment received/i.test(value);

async function parseCsv(buffer: Buffer): Promise<Transaction[]> {
  const rows: Record<string, string>[] = [];
  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  return rows.flatMap((row) => {
    const values = Object.entries(row);
    const get = (names: RegExp) => values.find(([key]) => names.test(key))?.[1] ?? '';
    const credit = money(get(/credit|deposit|income|salary/i));
    const debit = money(get(/debit|withdraw|expense|payment/i));
    const amount = money(get(/amount|value|transaction/i));
    const type = get(/type|transaction.*kind|cr.?dr/i);
    if (credit || debit) {
      return [
        credit ? { amount: credit, type: 'credit' as const, date: get(/date|time/i) } : null,
        debit ? { amount: debit, type: 'debit' as const, date: get(/date|time/i) } : null,
      ].filter(Boolean) as Transaction[];
    }
    if (!amount) return [];
    return [{ amount, type: isCredit(`${type} ${get(/description|narration|particular/i)}`) ? 'credit' : 'debit', date: get(/date|time/i) }];
  });
}

async function parsePdf(buffer: Buffer): Promise<Transaction[]> {
  const { text } = await pdfParse(buffer);
  return text.split(/\r?\n/).flatMap((line) => {
    const numbers = line.match(/(?:₹|INR|Rs\.?\s*)?\d[\d,]*(?:\.\d{1,2})?/g);
    if (!numbers?.length) return [];
    const amount = money(numbers[numbers.length - 1]);
    if (!amount || /opening|closing|balance/i.test(line) && numbers.length < 2) return [];
    return [{ amount, type: isCredit(line) ? 'credit' : 'debit' }];
  });
}

export async function buildStatementProfile(buffer: Buffer, mimeType: string): Promise<StatementProfile> {
  const transactions = mimeType.includes('pdf') ? await parsePdf(buffer) : await parseCsv(buffer);
  if (!transactions.length) throw new Error('No transactions found in the uploaded statement');

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