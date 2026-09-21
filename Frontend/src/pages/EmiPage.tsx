import { useState } from 'react';
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
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import FloatingAI from '../components/FloatingAI';
import { api } from '../api/client';
import { Loan } from '../types';

export default function EmiPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amortization, setAmortization] = useState<any[]>([]);

  if (!user) return null;

  const loans: Loan[] = [
    {
      id: '1',
      type: 'Personal Loan',
      lender: 'HDFC Bank',
      outstanding: Math.round(user.existing_debt * 0.4),
      rate: 18,
      tenure: 18,
      emi: Math.round(user.monthly_emi * 0.37),
    },
    {
      id: '2',
      type: 'Credit Card',
      lender: 'ICICI',
      outstanding: user.credit_card_balance || 50000,
      rate: 36,
      tenure: 12,
      emi: Math.round(user.monthly_emi * 0.27),
    },
    {
      id: '3',
      type: 'Vehicle Loan',
      lender: 'Bajaj Finance',
      outstanding: user.vehicle_loan_outstanding || 100000,
      rate: 11,
      tenure: 24,
      emi: Math.round(user.monthly_emi * 0.27),
    },
    {
      id: '4',
      type: 'BNPL',
      lender: 'Simpl',
      outstanding: user.bnpl_balance || 20000,
      rate: 24,
      tenure: 6,
      emi: Math.round(user.monthly_emi * 0.09),
    },
  ];

  const highestInterest = [...loans].sort((a, b) => b.rate - a.rate)[0];
  const largestEmi = [...loans].sort((a, b) => b.emi - a.emi)[0];

  const chartData = loans.map((l) => ({
    name: l.type.replace(' Loan', ''),
    emi: l.emi,
    outstanding: l.outstanding,
    rate: l.rate,
  }));

  const openDetails = async (loan: Loan) => {
    setSelectedLoan(loan);
    try {
      const res = await api.amortization(loan);
      setAmortization(res.data);
    } catch (err) {
      console.error('Failed to fetch amortization', err);
    }
  };

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
            EMI &amp; Loan Management
          </h1>
          <p className="text-slate-400 mt-1">
            Track all your loans, EMIs, and interest obligations
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <MetricCard
            label="Total Outstanding"
            value={`₹${user.existing_debt.toLocaleString('en-IN')}`}
          />
          <MetricCard
            label="Total Monthly EMI"
            value={`₹${user.monthly_emi.toLocaleString('en-IN')}`}
            accent="blue"
          />
          <MetricCard label="FOIR" value={`${user.foir_pct}%`} accent="amber" />
          <MetricCard
            label="Active Loans"
            value={user.active_loan_count}
            accent="blue"
          />
          <MetricCard
            label="Missed Payments"
            value={user.missed_payments_12m}
            accent={user.missed_payments_12m > 0 ? 'red' : 'green'}
            sub="Last 12 months"
          />
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-4">Your Loans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-slate-100 font-bold text-lg">
                    {loan.type}
                  </div>
                  <div className="text-slate-400 text-sm">{loan.lender}</div>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                  {loan.rate}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm my-4">
                <Row
                  label="Outstanding"
                  value={`₹${loan.outstanding.toLocaleString('en-IN')}`}
                />
                <Row
                  label="Monthly EMI"
                  value={`₹${loan.emi.toLocaleString('en-IN')}`}
                />
                <Row label="Tenure Left" value={`${loan.tenure} months`} />
                <Row
                  label="Rate"
                  value={`${loan.rate}%`}
                  highlight={loan.rate > 30}
                />
              </div>

              <button
                onClick={() => openDetails(loan)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg text-sm font-medium transition"
              >
                View Details
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5">
            <div className="text-red-300 text-xs uppercase tracking-wider mb-1">
              ⚠ Highest Interest Loan
            </div>
            <div className="text-slate-100 font-bold text-lg">
              {highestInterest.type} — {highestInterest.rate}%
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5">
            <div className="text-amber-300 text-xs uppercase tracking-wider mb-1">
              💡 Largest EMI
            </div>
            <div className="text-slate-100 font-bold text-lg">
              {largestEmi.type} — ₹{largestEmi.emi.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <ChartBox title="EMI by Loan">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="emi" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Outstanding by Loan">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="outstanding" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Interest Rate Comparison">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="rate" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Outstanding Balance Over Time">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={Array.from({ length: 12 }, (_, i) => ({
                  month: `M${i + 1}`,
                  balance: Math.max(
                    0,
                    user.existing_debt - (user.existing_debt / 12) * i
                  ),
                }))}
              >
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>
      </main>

      {selectedLoan && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLoan(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">
                  {selectedLoan.type}
                </h2>
                <p className="text-slate-400 text-sm">{selectedLoan.lender}</p>
              </div>
              <button
                onClick={() => setSelectedLoan(null)}
                className="text-slate-400 hover:text-slate-100 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Row
                label="Outstanding"
                value={`₹${selectedLoan.outstanding.toLocaleString('en-IN')}`}
              />
              <Row label="Rate" value={`${selectedLoan.rate}%`} />
              <Row
                label="Monthly EMI"
                value={`₹${selectedLoan.emi.toLocaleString('en-IN')}`}
              />
              <Row label="Tenure" value={`${selectedLoan.tenure} months`} />
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-3">
              Amortization Schedule
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="text-left px-3 py-2">Month</th>
                    <th className="text-right px-3 py-2">EMI</th>
                    <th className="text-right px-3 py-2">Principal</th>
                    <th className="text-right px-3 py-2">Interest</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortization.slice(0, 24).map((r, i) => (
                    <tr key={i} className="border-b border-slate-800 text-slate-300">
                      <td className="px-3 py-2">{r.month}</td>
                      <td className="text-right px-3 py-2 font-mono">
                        ₹{r.emi.toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-green-400">
                        ₹{r.principal.toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-red-400">
                        ₹{r.interest.toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        ₹{r.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <FloatingAI />
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-slate-500 text-xs uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`font-bold font-mono ${
          highlight ? 'text-red-400' : 'text-slate-100'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-slate-200 font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}