import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConsolidationLoan, compareConsolidation, formatCurrency } from '../services/consolidationEngine';
import { Loan, User } from '../types';

interface Props {
  loans: Loan[];
  user: User;
}

type Field = 'outstanding' | 'rate' | 'tenure' | 'emi';

const starterLoan: ConsolidationLoan = {
  type: 'Personal loan',
  outstanding: 0,
  rate: 0,
  tenure: 0,
  emi: 0,
};

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default function ConsolidationSimulator({ loans, user }: Props) {
  const [entries, setEntries] = useState<ConsolidationLoan[]>([]);
  const [consolidationAmount, setConsolidationAmount] = useState(0);
  const [rate, setRate] = useState(14);
  const [tenure, setTenure] = useState(48);
  const [processingFee, setProcessingFee] = useState(0);
  const [foreclosureCharges, setForeclosureCharges] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);

  useEffect(() => {
    if (loans.length) {
      setEntries(loans.map(({ type, outstanding, rate, tenure, emi, id }) => ({ id, type, outstanding, rate, tenure, emi })));
      setConsolidationAmount(loans.reduce((sum, loan) => sum + loan.outstanding, 0));
    }
  }, [loans]);

  const principal = entries.reduce((sum, loan) => sum + loan.outstanding, 0);
  const result = useMemo(() => compareConsolidation({
    loans: entries,
    consolidationAmount: consolidationAmount || principal,
    consolidationRate: rate,
    consolidationTenure: tenure,
    processingFee,
    foreclosureCharges,
    monthlyIncome: user.monthly_income,
    extraMonthlyPayment: extraPayment,
  }), [entries, principal, consolidationAmount, rate, tenure, processingFee, foreclosureCharges, user.monthly_income, extraPayment]);

  const updateLoan = (index: number, field: Field, value: string) => {
    setEntries((current) => current.map((loan, loanIndex) => loanIndex === index ? { ...loan, [field]: numberValue(value) } : loan));
  };

  const updateType = (index: number, value: string) => {
    setEntries((current) => current.map((loan, loanIndex) => loanIndex === index ? { ...loan, type: value } : loan));
  };

  const addLoan = () => setEntries((current) => [...current, { ...starterLoan, type: `Loan ${current.length + 1}` }]);
  const removeLoan = (index: number) => setEntries((current) => current.filter((_, loanIndex) => loanIndex !== index));
  const chartData = [
    { name: 'Monthly EMI', existing: result.existing.emi, consolidated: result.consolidated.emi },
    { name: 'Total interest', existing: result.existing.totalInterest, consolidated: result.consolidated.totalInterest },
    { name: 'Total repayment', existing: result.existing.totalRepayment, consolidated: result.consolidated.totalRepayment },
  ];
  const signedCurrency = (value: number) => `${value < 0 ? '-' : '+'}${formatCurrency(value)}`;
  const verdictClass = result.verdict === 'save' ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : result.warning ? 'border-rose-400/60 bg-rose-400/10 text-rose-100' : 'border-amber-400/50 bg-amber-400/10 text-amber-100';

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-cyan-300 text-xs font-bold uppercase tracking-[0.2em]">DebtLens AI / Truth Engine</div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-100 mt-2">Should you consolidate?</h2>
          <p className="text-slate-400 mt-2 max-w-2xl">A deterministic comparison of your current loans and a hypothetical refinance. Lower EMI is never treated as a win by itself.</p>
        </div>
        <div className="text-right text-sm text-slate-400"><span className="text-slate-100 font-semibold">{entries.length}</span> loans modeled<br /><span className="text-slate-100 font-semibold">{formatCurrency(principal)}</span> total principal</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4"><div><h3 className="text-lg font-bold text-slate-100">Existing loans</h3><p className="text-slate-500 text-sm">Use the actual EMI and tenure remaining.</p></div><button onClick={addLoan} className="text-sm font-bold text-cyan-300 hover:text-cyan-200">+ Add loan</button></div>
          <div className="space-y-3">
            {entries.map((loan, index) => (
              <div key={loan.id || index} className="border border-slate-700/70 bg-slate-950/50 rounded-xl p-3">
                <div className="flex gap-2 mb-3"><input value={loan.type} onChange={(event) => updateType(index, event.target.value)} aria-label="Loan type" className="field flex-1" /><button onClick={() => removeLoan(index)} aria-label={`Remove ${loan.type}`} className="remove-button">×</button></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <NumberField label="Outstanding" value={loan.outstanding} onChange={(value) => updateLoan(index, 'outstanding', value)} prefix="₹" />
                  <NumberField label="Rate %" value={loan.rate} onChange={(value) => updateLoan(index, 'rate', value)} suffix="%" />
                  <NumberField label="Months left" value={loan.tenure} onChange={(value) => updateLoan(index, 'tenure', value)} />
                  <NumberField label="Current EMI" value={loan.emi} onChange={(value) => updateLoan(index, 'emi', value)} prefix="₹" />
                </div>
              </div>
            ))}
            {!entries.length && <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-500">Add your first loan to unlock the comparison.</div>}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-cyan-400/30 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4"><div><h3 className="text-lg font-bold text-slate-100">Consolidation offer</h3><p className="text-slate-500 text-sm">Change the offer to run the What-If simulation.</p></div><span className="text-cyan-300 text-xs font-bold uppercase">Debt Twin</span></div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Consolidation amount" value={consolidationAmount || principal} onChange={setConsolidationAmount} prefix="₹" />
            <NumberField label="Interest rate" value={rate} onChange={setRate} suffix="%" step="0.1" />
            <NumberField label="Tenure" value={tenure} onChange={setTenure} suffix="mo" />
            <NumberField label="Processing fee" value={processingFee} onChange={setProcessingFee} prefix="₹" />
            <NumberField label="Foreclosure charges" value={foreclosureCharges} onChange={setForeclosureCharges} prefix="₹" />
            <NumberField label="Extra monthly payment" value={extraPayment} onChange={setExtraPayment} prefix="₹" />
          </div>
          <div className="mt-5 border-t border-slate-800 pt-4"><label className="text-xs text-slate-500 uppercase tracking-wider">Monthly income</label><div className="mt-1 text-slate-100 font-bold">{formatCurrency(user.monthly_income)} <span className="text-slate-500 font-normal">from your profile</span></div></div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 md:p-5 ${verdictClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em]">Consolidation Truth Engine verdict</div><div className="text-xl font-black mt-1">{result.warning || (result.verdict === 'save' ? 'Consolidation lowers your overall cost' : 'The two paths are financially close')}</div></div><div className="font-mono text-sm">Overall cost: {signedCurrency(result.overallCostDifference)}</div></div>
        {result.warning && <p className="text-sm mt-2 opacity-90">The monthly relief is real, but the longer or costlier repayment path outweighs it.</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScenarioCard title="KEEP EXISTING LOANS" tone="slate" scenario={result.existing} />
        <ScenarioCard title="CONSOLIDATE" tone="cyan" scenario={result.consolidated} fees={result.consolidated.fees} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6">
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-100">Financial impact</h3><span className="text-xs text-slate-500">Live from verified math</span></div><ResponsiveContainer width="100%" height={260}><BarChart data={chartData} margin={{ left: 10, right: 10 }}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} /><Bar dataKey="existing" name="Keep existing" fill="#64748b" radius={[4, 4, 0, 0]} /><Bar dataKey="consolidated" name="Consolidate" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-5"><h3 className="font-bold text-slate-100 mb-4">What changes?</h3><div className="space-y-4"><Difference label="EMI difference" value={signedCurrency(result.emiDifference)} good={result.emiDifference < 0} /><Difference label="Interest difference" value={signedCurrency(result.interestDifference)} good={result.interestDifference < 0} /><Difference label="Debt-free timeline" value={`${result.consolidated.months - result.existing.months > 0 ? '+' : ''}${result.consolidated.months - result.existing.months} months`} good={result.consolidated.months <= result.existing.months} /><Difference label="Monthly buffer" value={signedCurrency(result.consolidated.monthlyBuffer - result.existing.monthlyBuffer)} good={result.consolidated.monthlyBuffer > result.existing.monthlyBuffer} /></div></div>
      </div>
      <div className="text-xs text-slate-500 px-1">AI explanation is intentionally downstream of this verified calculation. The numbers above are produced locally and never generated by an LLM.</div>
    </section>
  );
}

function NumberField({ label, value, onChange, prefix, suffix, disabled = false, step = '1' }: { label: string; value: number; onChange: (value: string) => void; prefix?: string; suffix?: string; disabled?: boolean; step?: string }) {
  return <label className="block"><span className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</span><div className="relative mt-1">{prefix && <span className="absolute left-2 top-2 text-slate-500 text-sm">{prefix}</span>}<input type="number" min="0" step={step} value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`field w-full ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-9' : ''}`} />{suffix && <span className="absolute right-2 top-2 text-slate-500 text-xs">{suffix}</span>}</div></label>;
}

function ScenarioCard({ title, tone, scenario, fees = 0 }: { title: string; tone: 'slate' | 'cyan'; scenario: ReturnType<typeof compareConsolidation>['existing']; fees?: number }) {
  return <div className={`rounded-2xl border p-5 ${tone === 'cyan' ? 'border-cyan-400/40 bg-cyan-400/[0.06]' : 'border-slate-700 bg-slate-900/70'}`}><div className="flex items-center justify-between mb-5"><h3 className="font-black tracking-wide text-slate-100">{title}</h3><span className={`text-xs font-bold px-2 py-1 rounded-full ${tone === 'cyan' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-slate-700 text-slate-300'}`}>{tone === 'cyan' ? 'FUTURE B' : 'FUTURE A'}</span></div><div className="grid grid-cols-2 gap-y-5 gap-x-4"><Metric label="Monthly EMI" value={formatCurrency(scenario.emi)} /><Metric label="Total interest" value={formatCurrency(scenario.totalInterest)} /><Metric label="Total repayment" value={formatCurrency(scenario.totalRepayment)} /><Metric label="Debt-free" value={scenario.debtFreeDate} /><Metric label="Monthly buffer" value={formatCurrency(scenario.monthlyBuffer)} /><Metric label="Fees included" value={formatCurrency(fees)} /></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div><div className="text-lg text-slate-100 font-bold font-mono mt-1">{value}</div></div>; }
function Difference({ label, value, good }: { label: string; value: string; good: boolean }) { return <div className="flex items-center justify-between border-b border-slate-800 pb-3"><span className="text-sm text-slate-400">{label}</span><span className={`font-mono font-bold ${good ? 'text-emerald-300' : 'text-rose-300'}`}>{value}</span></div>; }
