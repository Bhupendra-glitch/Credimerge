export interface ConsolidationLoan {
  id?: string;
  type: string;
  outstanding: number;
  rate: number;
  tenure: number;
  emi: number;
}

export interface ConsolidationInput {
  loans: ConsolidationLoan[];
  consolidationAmount: number;
  consolidationRate: number;
  consolidationTenure: number;
  processingFee: number;
  foreclosureCharges: number;
  monthlyIncome: number;
  extraMonthlyPayment: number;
}

export interface ScenarioResult {
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  fees: number;
  months: number;
  debtFreeDate: string;
  monthlyBuffer: number;
  balanceByMonth: { month: number; balance: number }[];
}

export interface ConsolidationComparison {
  existing: ScenarioResult;
  consolidated: ScenarioResult;
  emiDifference: number;
  interestDifference: number;
  repaymentDifference: number;
  overallCostDifference: number;
  verdict: 'save' | 'cost' | 'lower-emi-higher-cost' | 'neutral';
  warning: string | null;
}

const finitePositive = (value: number) => Number.isFinite(value) && value > 0;
const safe = (value: number) => (Number.isFinite(value) ? value : 0);

export function calculateEmi(principal: number, annualRate: number, months: number): number {
  if (!finitePositive(principal) || !finitePositive(months) || !Number.isFinite(annualRate) || annualRate < 0) return 0;
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function amortize(principal: number, annualRate: number, payment: number, extra: number) {
  if (!finitePositive(principal)) return { months: 0, totalPaid: 0, balanceByMonth: [] as { month: number; balance: number }[] };

  const monthlyRate = Math.max(0, safe(annualRate)) / 1200;
  const scheduledPayment = Math.max(0, safe(payment)) + Math.max(0, safe(extra));
  if (!finitePositive(scheduledPayment)) return { months: 0, totalPaid: 0, balanceByMonth: [] as { month: number; balance: number }[] };

  let balance = principal;
  let totalPaid = 0;
  const balanceByMonth: { month: number; balance: number }[] = [];
  for (let month = 1; month <= 600 && balance > 0.005; month += 1) {
    const interest = balance * monthlyRate;
    const paid = Math.min(balance + interest, scheduledPayment);
    balance = Math.max(0, balance + interest - paid);
    totalPaid += paid;
    balanceByMonth.push({ month, balance: Math.round(balance * 100) / 100 });
  }
  return { months: balanceByMonth.length, totalPaid, balanceByMonth };
}

function addMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(0, months));
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function scenarioResult(
  principal: number,
  rate: number,
  scheduledEmi: number,
  fees: number,
  extra: number,
  income: number,
): ScenarioResult {
  const amortization = amortize(principal, rate, scheduledEmi, extra);
  const totalRepayment = amortization.totalPaid + Math.max(0, fees);
  return {
    emi: Math.round(Math.max(0, scheduledEmi) * 100) / 100,
    totalInterest: Math.round(Math.max(0, amortization.totalPaid - principal) * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    fees: Math.round(Math.max(0, fees) * 100) / 100,
    months: amortization.months,
    debtFreeDate: addMonths(amortization.months),
    monthlyBuffer: Math.round((safe(income) - Math.max(0, scheduledEmi) - Math.max(0, extra)) * 100) / 100,
    balanceByMonth: amortization.balanceByMonth,
  };
}

export function compareConsolidation(input: ConsolidationInput): ConsolidationComparison {
  const loans = input.loans.filter((loan) => finitePositive(loan.outstanding) && finitePositive(loan.tenure));
  const principal = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const existingEmi = loans.reduce(
    (sum, loan) => sum + (finitePositive(loan.emi) ? loan.emi : calculateEmi(loan.outstanding, loan.rate, loan.tenure)),
    0,
  );
  const existingMonths = loans.length ? Math.max(...loans.map((loan) => loan.tenure)) : 0;
  const existing = scenarioResult(
    principal,
    loans.length ? loans.reduce((sum, loan) => sum + loan.outstanding * loan.rate, 0) / principal : 0,
    existingEmi,
    0,
    input.extraMonthlyPayment,
    input.monthlyIncome,
  );
  const consolidatedPrincipal = finitePositive(input.consolidationAmount) ? input.consolidationAmount : principal;
  const consolidatedEmi = calculateEmi(consolidatedPrincipal, Math.max(0, input.consolidationRate), input.consolidationTenure);
  const consolidated = scenarioResult(
    consolidatedPrincipal,
    input.consolidationRate,
    consolidatedEmi,
    Math.max(0, input.processingFee) + Math.max(0, input.foreclosureCharges),
    input.extraMonthlyPayment,
    input.monthlyIncome,
  );

  if (existing.months === 0 && existingMonths > 0) existing.months = existingMonths;
  const emiDifference = consolidated.emi - existing.emi;
  const interestDifference = consolidated.totalInterest - existing.totalInterest;
  const repaymentDifference = consolidated.totalRepayment - existing.totalRepayment;
  const overallCostDifference = repaymentDifference;
  const lowerEmi = emiDifference < -0.5;
  const higherCost = overallCostDifference > 0.5;
  const verdict = lowerEmi && higherCost ? 'lower-emi-higher-cost' : overallCostDifference < -0.5 ? 'save' : higherCost ? 'cost' : 'neutral';

  return {
    existing,
    consolidated,
    emiDifference: Math.round(emiDifference * 100) / 100,
    interestDifference: Math.round(interestDifference * 100) / 100,
    repaymentDifference: Math.round(repaymentDifference * 100) / 100,
    overallCostDifference: Math.round(overallCostDifference * 100) / 100,
    verdict,
    warning: verdict === 'lower-emi-higher-cost'
      ? 'LOWER EMI, HIGHER TOTAL COST'
      : verdict === 'cost'
        ? 'Consolidation costs more overall'
        : null,
  };
}

export function formatCurrency(value: number) {
  return `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}
