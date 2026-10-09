import { getTransactions, Transaction } from './transactionService';
import { listLoans, getUserProfile } from './supabaseService';

export interface InferredObligation {
  id: string;
  lenderOrMerchant: string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Weekly';
  confidence: number;
  status: 'INFERRED' | 'USER_CONFIRMED';
  sourceTransactionIds: string[];
  lastObservedDate: string;
  type: 'EMI' | 'SUBSCRIPTION' | 'RENT' | 'UTILITY';
  isPotentialDuplicate?: boolean;
  notes?: string;
}

export interface TransactionAdvisorInsights {
  verifiedMonthlyIncome: {
    amount: number;
    confidence: number;
    basis: string;
    isVerified: boolean;
  };
  verifiedMonthlyExpenses: {
    amount: number;
    basis: string;
  };
  inferredLoanRepayments: InferredObligation[];
  inferredSubscriptions: InferredObligation[];
  unusualSpendingAlerts: Array<{
    transactionId: string;
    description: string;
    amount: number;
    reason: string;
    date: string;
  }>;
  consolidationImpact: {
    existingTotalMonthlyEmi: number;
    inferredTotalMonthlyEmi: number;
    discrepancyAmount: number;
    verifiedCashflowSurplus: number;
    adjustedFoirPct: number;
    advisoryRecommendation: string;
    disclaimer: string;
  };
}

/**
 * Analyze user's real transactions and link insights to the loan consolidation advisor.
 */
export async function analyzeTransactionInsights(userId: string): Promise<TransactionAdvisorInsights> {
  const normUserId = userId.trim().toUpperCase();

  // Load transactions and user profile
  const [txResult, existingLoans, userProfile] = await Promise.all([
    getTransactions(normUserId, { limit: 100 }),
    listLoans(normUserId),
    getUserProfile(normUserId),
  ]);

  const transactions = txResult.transactions;

  // 1. Detect salary / verified income credits
  const salaryCredits = transactions.filter(
    (t) => t.type === 'CREDIT' && (t.category === 'SALARY' || t.description.toLowerCase().includes('salary'))
  );

  let verifiedIncome = 0;
  let incomeConfidence = 0.5;
  let incomeBasis = 'User stated income';

  if (salaryCredits.length >= 2) {
    const sum = salaryCredits.reduce((acc, t) => acc + t.amount, 0);
    verifiedIncome = Math.round(sum / salaryCredits.length);
    incomeConfidence = 0.95;
    incomeBasis = `Verified from ${salaryCredits.length} recurring salary credits across transaction history`;
  } else if (salaryCredits.length === 1) {
    verifiedIncome = salaryCredits[0].amount;
    incomeConfidence = 0.8;
    incomeBasis = 'Verified from single observed salary credit';
  } else {
    verifiedIncome = Number((userProfile as any)?.monthly_income || 0);
    incomeConfidence = 0.5;
    incomeBasis = 'Self-reported monthly income (no recurring salary credits detected yet)';
  }

  // 2. Identify loan repayments and recurring EMIs
  const loanDebits = transactions.filter(
    (t) => t.type === 'DEBIT' && (t.category === 'LOAN_REPAYMENT' || t.recurringObligationType === 'EMI')
  );

  // Group by lender / merchant
  const lenderMap = new Map<string, Transaction[]>();
  for (const t of loanDebits) {
    const key = (t.merchantName || t.description.substring(0, 15)).trim();
    if (!lenderMap.has(key)) lenderMap.set(key, []);
    lenderMap.get(key)!.push(t);
  }

  const inferredObligations: InferredObligation[] = [];
  const unusualAlerts: TransactionAdvisorInsights['unusualSpendingAlerts'] = [];

  for (const [lender, txs] of lenderMap.entries()) {
    txs.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    const latest = txs[0];

    // Check for potential duplicate debits (same amount and lender within 15 days)
    let hasDuplicate = false;
    if (txs.length >= 2) {
      const diffDays = Math.abs(
        (new Date(txs[0].transactionDate).getTime() - new Date(txs[1].transactionDate).getTime()) / 86400000
      );
      if (diffDays < 15 && Math.abs(txs[0].amount - txs[1].amount) < 5) {
        hasDuplicate = true;
        unusualAlerts.push({
          transactionId: txs[0].id,
          description: txs[0].description,
          amount: txs[0].amount,
          reason: `Potential duplicate loan repayment of ₹${txs[0].amount.toLocaleString('en-IN')} observed within ${Math.round(diffDays)} days.`,
          date: txs[0].transactionDate,
        });
      }
    }

    inferredObligations.push({
      id: `INF_EMI_${latest.id}`,
      lenderOrMerchant: lender,
      amount: latest.amount,
      frequency: 'Monthly',
      confidence: latest.isUserConfirmedCategory ? 1.0 : latest.categoryConfidence,
      status: latest.isUserConfirmedCategory ? 'USER_CONFIRMED' : 'INFERRED',
      sourceTransactionIds: txs.map((t) => t.id),
      lastObservedDate: latest.transactionDate,
      type: 'EMI',
      isPotentialDuplicate: hasDuplicate,
      notes: hasDuplicate ? 'Warning: Possible duplicate debit detected for this loan cycle.' : undefined,
    });
  }

  // 3. Identify recurring subscriptions
  const subDebits = transactions.filter(
    (t) => t.type === 'DEBIT' && (t.recurringObligationType === 'SUBSCRIPTION' || t.category === 'ENTERTAINMENT')
  );

  const subMap = new Map<string, Transaction[]>();
  for (const t of subDebits) {
    const key = (t.merchantName || t.description).trim();
    if (!subMap.has(key)) subMap.set(key, []);
    subMap.get(key)!.push(t);
  }

  const inferredSubscriptions: InferredObligation[] = [];
  for (const [merchant, txs] of subMap.entries()) {
    const latest = txs[0];
    inferredSubscriptions.push({
      id: `INF_SUB_${latest.id}`,
      lenderOrMerchant: merchant,
      amount: latest.amount,
      frequency: 'Monthly',
      confidence: 0.9,
      status: 'INFERRED',
      sourceTransactionIds: txs.map((t) => t.id),
      lastObservedDate: latest.transactionDate,
      type: 'SUBSCRIPTION',
    });
  }

  // 4. Monthly expenses calculation
  const monthlyExpenses = transactions
    .filter((t) => t.type === 'DEBIT' && t.category !== 'LOAN_REPAYMENT')
    .reduce((acc, t) => acc + t.amount, 0);

  // 5. Correlate with Credimerge Loan Consolidation Advisor
  const existingLoansTotalEmi = existingLoans.reduce((acc, l) => acc + Number(l.emi || 0), 0);
  const inferredTotalEmi = inferredObligations.reduce((acc, o) => acc + o.amount, 0);
  const effectiveEmi = inferredTotalEmi > 0 ? inferredTotalEmi : existingLoansTotalEmi;

  const verifiedCashflowSurplus = Math.max(0, verifiedIncome - monthlyExpenses - effectiveEmi);
  const adjustedFoir = verifiedIncome > 0 ? (effectiveEmi / verifiedIncome) * 100 : 0;

  let advisoryRecommendation = '';
  if (adjustedFoir > 50) {
    advisoryRecommendation =
      'High FOIR detected (>50%). Verified bank transactions indicate loan repayments consume a critical portion of your monthly cash flow. Consolidating into a single long-tenure loan can lower your monthly EMI outflow.';
  } else if (existingLoans.length >= 2 || inferredObligations.length >= 2) {
    advisoryRecommendation =
      'Multiple concurrent loan facilities detected. Consolidating your scattered EMIs can simplify repayments into a single monthly deduction and potentially reduce blended interest rates.';
  } else {
    advisoryRecommendation =
      'Healthy cash flow profile observed. Current debt obligations are well within safe affordability guidelines.';
  }

  return {
    verifiedMonthlyIncome: {
      amount: verifiedIncome,
      confidence: incomeConfidence,
      basis: incomeBasis,
      isVerified: incomeConfidence >= 0.8,
    },
    verifiedMonthlyExpenses: {
      amount: Math.round(monthlyExpenses),
      basis: `Aggregated from ${transactions.filter((t) => t.type === 'DEBIT').length} debit transactions`,
    },
    inferredLoanRepayments: inferredObligations,
    inferredSubscriptions: inferredSubscriptions,
    unusualSpendingAlerts: unusualAlerts,
    consolidationImpact: {
      existingTotalMonthlyEmi: +existingLoansTotalEmi.toFixed(2),
      inferredTotalMonthlyEmi: +inferredTotalEmi.toFixed(2),
      discrepancyAmount: +Math.abs(existingLoansTotalEmi - inferredTotalEmi).toFixed(2),
      verifiedCashflowSurplus: +verifiedCashflowSurplus.toFixed(2),
      adjustedFoirPct: +adjustedFoir.toFixed(2),
      advisoryRecommendation,
      disclaimer:
        'CrediMerge provides mathematical estimates and cash-flow intelligence based on available transaction records. This is not an offer or guarantee of credit, loan approval, or formal credit score alteration.',
    },
  };
}
