import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import FloatingAI from '../components/FloatingAI';

export default function CreditHealth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [progress, setProgress] = useState(0);

  if (!user) return null;

  const stages = [
    'Reading statement',
    'Extracting transactions',
    'Categorizing transactions',
    'Calculating cashflow',
    'Generating credit health',
  ];

  const startProcessing = () => {
    setStep('processing');
    setProgress(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProgress(i);
      if (i >= stages.length) {
        clearInterval(interval);
        setTimeout(() => setStep('result'), 400);
      }
    }, 600);
  };

  // ---- Factor calculations ----
  const incomeStability = Math.min(25, user.income_stability_score * 25);
  const surplusAdequacy = Math.min(
    20,
    (user.monthly_cashflow / user.monthly_income) * 20
  );
  const repaymentDiscipline = user.repayment_rate * 25;
  const balanceBuffer = Math.min(15, user.monthly_savings / 2000);
  const dataVintage = 12;

  const factors = [
    { name: 'Income Stability', value: +incomeStability.toFixed(1), max: 25 },
    { name: 'Surplus Adequacy', value: +surplusAdequacy.toFixed(1), max: 20 },
    { name: 'Repayment Discipline', value: +repaymentDiscipline.toFixed(1), max: 25 },
    { name: 'Balance Buffer', value: +balanceBuffer.toFixed(1), max: 15 },
    { name: 'Data Vintage', value: dataVintage, max: 15 },
  ];

  const trendData = [
    { month: 'Apr', income: user.monthly_income * 0.9, expenses: user.monthly_expenses * 0.95 },
    { month: 'May', income: user.monthly_income * 1.0, expenses: user.monthly_expenses * 0.98 },
    { month: 'Jun', income: user.monthly_income * 1.05, expenses: user.monthly_expenses * 1.02 },
    { month: 'Jul', income: user.monthly_income * 0.95, expenses: user.monthly_expenses * 0.97 },
    { month: 'Aug', income: user.monthly_income * 1.02, expenses: user.monthly_expenses * 1.01 },
    { month: 'Sep', income: user.monthly_income * 0.98, expenses: user.monthly_expenses },
  ];

  const foirBased = user.monthly_income * 0.4 - user.monthly_emi;
  const surplusBased = user.monthly_cashflow * 0.5;
  const recommended = Math.min(foirBased, surplusBased);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/home')}
          className="text-slate-400 hover:text-slate-100 text-sm mb-4"
        >
          ← Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            Alternative Credit Health
          </h1>
          <p className="text-slate-400 mt-1">
            Build a cashflow-based financial profile from your banking history
          </p>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UploadCard
              icon="📄"
              title="Upload Statement"
              button="Upload PDF"
              accept=".pdf,application/pdf"
              onFileSelect={startProcessing}
            />
            <UploadCard
              icon="📊"
              title="Upload CSV"
              button="Upload CSV"
              accept=".csv,text/csv"
              onFileSelect={startProcessing}
            />
            <UploadCard icon="✏️" title="Manual Entry" button="Add Data" />
            <div className="md:col-span-3">
              <button
                onClick={startProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition"
              >
                ⚡ Load Sample Data &amp; Generate Score
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">
              Analyzing your statement...
            </h2>
            <div className="space-y-4">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < progress
                        ? 'bg-green-500 text-white'
                        : i === progress
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i < progress ? '✓' : i + 1}
                  </div>
                  <span
                    className={
                      i <= progress ? 'text-slate-100' : 'text-slate-500'
                    }
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && (
          <>
            {/* Score header */}
            <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/50 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="8"
                    strokeDasharray={`${(user.cashflow_score / 100) * 283} 283`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-extrabold font-mono text-slate-100">
                    {Math.round(user.cashflow_score)}
                  </div>
                  <div className="text-slate-400 text-xs">/ 100</div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="text-slate-400 text-sm uppercase tracking-wider">
                  Your Credit Health Score
                </div>
                <div className="text-3xl font-bold text-slate-100 mt-1">
                  {user.risk_band}
                </div>
                <div className="text-slate-400 mt-2">
                  Based on 6 months of transaction history
                </div>
              </div>
            </div>

            {/* 5-factor breakdown */}
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              Factor Breakdown
            </h2>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={factors} layout="vertical">
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    width={170}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-6">
                {factors.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className="text-slate-400 text-xs mb-1">{f.name}</div>
                    <div className="text-slate-100 font-bold font-mono">
                      {f.value}/{f.max}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cashflow summary */}
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              Cashflow Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Avg Monthly Income"
                value={`₹${user.monthly_income.toLocaleString('en-IN')}`}
              />
              <MetricCard
                label="Avg Monthly Expenses"
                value={`₹${user.monthly_expenses.toLocaleString('en-IN')}`}
                accent="red"
              />
              <MetricCard
                label="Avg Surplus"
                value={`₹${user.monthly_cashflow.toLocaleString('en-IN')}`}
                accent="blue"
              />
              <MetricCard
                label="Income Volatility"
                value={`${((1 - user.income_stability_score) * 100).toFixed(1)}%`}
                accent="amber"
              />
              <MetricCard
                label="Monthly EMI Outflow"
                value={`₹${user.monthly_emi.toLocaleString('en-IN')}`}
                accent="amber"
              />
              <MetricCard
                label="Missed Payments"
                value={user.missed_payments_12m}
                accent={user.missed_payments_12m > 0 ? 'red' : 'green'}
              />
              <MetricCard
                label="Monthly Savings"
                value={`₹${user.monthly_savings.toLocaleString('en-IN')}`}
              />
              <MetricCard
                label="Data History"
                value="6 months"
                accent="blue"
              />
            </div>

            {/* Monthly trend */}
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              Monthly Income vs Expenses
            </h2>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 mb-8">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Safe EMI Capacity */}
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              💰 Safe EMI Capacity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <MetricCard
                label="FOIR-based"
                value={`₹${Math.max(0, foirBased).toFixed(0)}`}
                sub="Keeps EMI under 40% of income"
                accent="blue"
              />
              <MetricCard
                label="Surplus-based"
                value={`₹${surplusBased.toFixed(0)}`}
                sub="50% of monthly surplus"
                accent="blue"
              />
              <MetricCard
                label="Recommended"
                value={`₹${Math.max(0, recommended).toFixed(0)}`}
                sub="Conservative, safe limit"
                accent={recommended > 0 ? 'green' : 'red'}
              />
            </div>

            {/* Red flags + positives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-500/5 border border-red-500/40 rounded-xl p-6">
                <h3 className="text-red-300 font-bold mb-3">⚠ Red Flags</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  {user.income_stability_score < 0.7 && (
                    <li>• Income varies significantly month to month</li>
                  )}
                  {user.missed_payments_12m > 0 && (
                    <li>• {user.missed_payments_12m} payment bounce(s) detected</li>
                  )}
                  {user.monthly_savings < 10000 && (
                    <li>• Balance buffer is relatively low</li>
                  )}
                  {user.foir_pct > 15 && (
                    <li>• FOIR at {user.foir_pct}% is elevated</li>
                  )}
                  {user.income_stability_score >= 0.7 &&
                    user.missed_payments_12m === 0 &&
                    user.monthly_savings >= 10000 && (
                      <li>• No major flags detected — well managed</li>
                    )}
                </ul>
              </div>

              <div className="bg-green-500/5 border border-green-500/40 rounded-xl p-6">
                <h3 className="text-green-300 font-bold mb-3">✓ Positive Signals</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li>• Regular income detected across the period</li>
                  <li>• {user.repayment_rate * 100}% repayment discipline</li>
                  <li>• 6 months of transaction history available</li>
                  {user.monthly_cashflow > 0 && (
                    <li>
                      • Positive monthly surplus of ₹
                      {user.monthly_cashflow.toLocaleString('en-IN')}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="mt-8 w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition"
            >
              📄 Generate Credit Health Report
            </button>
          </>
        )}
      </main>

      <FloatingAI />
    </div>
  );
}

function UploadCard({
  icon,
  title,
  button,
  accept,
  onFileSelect,
}: {
  icon: string;
  title: string;
  button: string;
  accept?: string;
  onFileSelect?: (file: File) => void;
}) {
  const inputId = `credit-health-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
    event.target.value = '';
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center hover:border-green-500/40 transition cursor-pointer">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-slate-100 font-bold mb-4">{title}</div>
      {onFileSelect ? (
        <>
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            className="block w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg text-sm transition cursor-pointer"
          >
            {button}
          </label>
        </>
      ) : (
        <button className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg text-sm transition">
          {button}
        </button>
      )}
    </div>
  );
}