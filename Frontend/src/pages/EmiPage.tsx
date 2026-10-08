import { useEffect, useState } from 'react';
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
import { api, buildProfileLoanFallback } from '../api/client';
import { Loan } from '../types';

type AmortizationRow = {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
};

type LoanSort = 'outstanding' | 'emi' | 'rate';

export default function EmiPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amortization, setAmortization] = useState<AmortizationRow[]>([]);
  const [amortizationLoading, setAmortizationLoading] = useState(false);
  const [amortizationError, setAmortizationError] = useState('');
  const [loans, setLoans] = useState<Loan[]>(() =>
    user ? buildProfileLoanFallback(user) : []
  );
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState('');
  const [loanSearch, setLoanSearch] = useState('');
  const [loanSort, setLoanSort] = useState<LoanSort>('outstanding');

  useEffect(() => {
    api.getLoans()
      .then((response) => {
        const loadedLoans = Array.isArray(response.data) ? response.data : [];
        setLoans(loadedLoans.length ? loadedLoans : (user ? buildProfileLoanFallback(user) : []));
      })
      .catch((error) => {
        console.error('Failed to load loans', error);
        const fallbackLoans = user ? buildProfileLoanFallback(user) : [];
        setLoans(fallbackLoans);
        setLoansError(
          fallbackLoans.length
            ? ''
            : 'Unable to load your current GigCred loan data.'
        );
      })
      .finally(() => setLoansLoading(false));
  }, [user]);

  if (!user) return null;

  const highestInterest = loans.length ? [...loans].sort((a, b) => b.rate - a.rate)[0] : null;
  const largestEmi = loans.length ? [...loans].sort((a, b) => b.emi - a.emi)[0] : null;
  const totalOutstanding = loans.reduce((total, loan) => total + Number(loan.outstanding || 0), 0);
  const totalMonthlyEmi = loans.reduce((total, loan) => total + Number(loan.emi || 0), 0);
  const filteredLoans = loans
    .filter((loan) => `${loan.type} ${loan.lender}`.toLowerCase().includes(loanSearch.trim().toLowerCase()))
    .sort((a, b) => b[loanSort] - a[loanSort]);

  const chartData = loans.map((l) => ({
    name: l.type.replace(' Loan', ''),
    emi: l.emi,
    outstanding: l.outstanding,
    rate: l.rate,
  }));
  const balanceData = Array.from(
    { length: Math.max(12, ...loans.map((loan) => loan.tenure), 1) },
    (_, index) => ({
      month: `M${index + 1}`,
      balance: loans.reduce((total, loan) => {
        return total + projectedBalance(loan, index + 1);
      }, 0),
    }),
  );

  const openDetails = async (loan: Loan) => {
    setSelectedLoan(loan);
    setAmortization([]);
    setAmortizationError('');
    setAmortizationLoading(true);
    try {
      const res = await api.amortization(loan);
      setAmortization(res.data);
    } catch (err) {
      console.error('Failed to fetch amortization', err);
      setAmortizationError('Unable to load the repayment schedule. Please try again.');
    } finally {
      setAmortizationLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedLoan(null);
    setAmortizationError('');
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <button
          onClick={() => navigate('/home')}
          className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          <span aria-hidden="true">←</span> Back to Home
        </button>

        <section className="relative mb-8 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Loan overview</div>
              <h1 className="text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
                EMI &amp; Loan Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Keep track of your monthly commitments, outstanding balances, and repayment schedules in one place.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 sm:min-w-44">
              <div className="text-xs uppercase tracking-wider text-slate-500">Monthly loan outflow</div>
              <div className="mt-1 text-xl font-bold text-cyan-200">{formatCurrency(totalMonthlyEmi)}</div>
              <div className="mt-1 text-xs text-slate-500">Across {loans.length} {loans.length === 1 ? 'loan' : 'loans'}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <MetricCard
            label="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            sub="Across listed loans"
          />
          <MetricCard
            label="Total Monthly EMI"
            value={formatCurrency(totalMonthlyEmi)}
            sub="Combined repayments"
            accent="blue"
          />
          <MetricCard label="FOIR" value={`${user.foir_pct}%`} sub="Debt-to-income indicator" accent="amber" />
          <MetricCard
            label="Active Loans"
            value={loans.length}
            sub="Currently listed"
            accent="blue"
          />
          <MetricCard
            label="Missed Payments"
            value={user.missed_payments_12m}
            accent={user.missed_payments_12m > 0 ? 'red' : 'green'}
            sub="Last 12 months"
          />
        </div>

        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Your Loans</h2>
              <p className="mt-1 text-sm text-slate-500">Search by loan type or lender, or sort by balance, EMI, and rate.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px]">
              <label className="sr-only" htmlFor="loan-search">Search loans</label>
              <input
                id="loan-search"
                type="search"
                value={loanSearch}
                onChange={(event) => setLoanSearch(event.target.value)}
                placeholder="Search loans or lenders"
                className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
              />
              <label className="sr-only" htmlFor="loan-sort">Sort loans</label>
              <select
                id="loan-sort"
                value={loanSort}
                onChange={(event) => setLoanSort(event.target.value as LoanSort)}
                className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
              >
                <option value="outstanding">Sort: highest balance</option>
                <option value="emi">Sort: highest EMI</option>
                <option value="rate">Sort: highest rate</option>
              </select>
            </div>
          </div>
          {loansLoading && (
            <p role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              Loading the latest loan details...
            </p>
          )}
          {!loansLoading && loansError && (
            <p role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{loansError}</p>
          )}
          {loans.some((loan) => loan.lender === 'GigCred profile estimate') && (
            <div className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm leading-relaxed text-cyan-100">
              Estimated loan categories are based on your profile balances. Rates and tenures are illustrative where loan-level details are unavailable.
            </div>
          )}
          {!loansLoading && loans.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
              <div className="text-3xl" aria-hidden="true">◇</div>
              <h3 className="mt-3 font-semibold text-slate-200">No loans to show yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Current loan details are not available for this account. Your summary will appear here when loan data is connected.
              </p>
            </div>
          )}
          {!loansLoading && loans.length > 0 && filteredLoans.length === 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-5 py-8 text-center text-sm text-slate-400">
              No loans match “{loanSearch}”. Try a different loan type or lender.
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLoans.map((loan) => (
              <article
                key={loan.id}
                className="group rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-950/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-lg font-bold text-cyan-200" aria-hidden="true">
                      {loan.type.trim().charAt(0).toUpperCase() || 'L'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-100">{loan.type}</h3>
                      <p className="truncate text-sm text-slate-400">{loan.lender}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${loan.rate > 30 ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'}`}>
                    {loan.rate}% p.a.
                  </span>
                </div>

                <div className="my-5 grid grid-cols-2 gap-x-4 gap-y-5">
                  <Row label="Outstanding balance" value={formatCurrency(loan.outstanding)} />
                  <Row label="Monthly EMI" value={formatCurrency(loan.emi)} />
                  <Row label="Tenure remaining" value={`${loan.tenure} months`} />
                  <Row label="Interest rate" value={`${loan.rate}% p.a.`} highlight={loan.rate > 30} />
                </div>

                <button
                  onClick={() => openDetails(loan)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  View repayment schedule <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {loans.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5">
            <div className="text-red-300 text-xs uppercase tracking-wider mb-1">
              ⚠ Highest Interest Loan
            </div>
            <div className="text-slate-100 font-bold text-lg">
              {highestInterest ? `${highestInterest.type} — ${highestInterest.rate}%` : 'No loan data available'}
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5">
            <div className="text-amber-300 text-xs uppercase tracking-wider mb-1">
              💡 Largest EMI
            </div>
            <div className="text-slate-100 font-bold text-lg">
              {largestEmi ? `${largestEmi.type} — ₹${largestEmi.emi.toLocaleString('en-IN')}` : 'No loan data available'}
            </div>
          </div>
        </div>}

        {loans.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                data={balanceData}
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
        </div>}
      </main>

      {selectedLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeDetails}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-details-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/40 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="loan-details-title" className="text-2xl font-bold text-slate-100">
                  {selectedLoan.type}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{selectedLoan.lender}</p>
              </div>
              <button
                onClick={closeDetails}
                aria-label="Close repayment schedule"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Row
                label="Outstanding"
                value={formatCurrency(selectedLoan.outstanding)}
              />
              <Row label="Rate" value={`${selectedLoan.rate}% p.a.`} />
              <Row
                label="Monthly EMI"
                value={formatCurrency(selectedLoan.emi)}
              />
              <Row label="Tenure" value={`${selectedLoan.tenure} months`} />
            </div>

            <div className="mb-3">
              <h3 className="text-lg font-bold text-slate-100">Repayment schedule</h3>
              <p className="mt-1 text-xs text-slate-500">Showing the first 24 months</p>
            </div>
            {amortizationLoading && <p role="status" className="py-8 text-center text-sm text-slate-400">Preparing repayment schedule...</p>}
            {amortizationError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{amortizationError}</p>}
            {!amortizationLoading && !amortizationError && amortization.length === 0 && (
              <p className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400">No repayment schedule is available for this loan.</p>
            )}
            {!amortizationLoading && !amortizationError && amortization.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left">Month</th>
                      <th scope="col" className="px-3 py-3 text-right">EMI</th>
                      <th scope="col" className="px-3 py-3 text-right">Principal</th>
                      <th scope="col" className="px-3 py-3 text-right">Interest</th>
                      <th scope="col" className="px-3 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortization.slice(0, 24).map((row) => (
                      <tr key={row.month} className="border-t border-slate-800 text-slate-300 transition hover:bg-slate-800/40">
                        <td className="px-3 py-3">{row.month}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.emi)}</td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-300">{formatCurrency(row.principal)}</td>
                        <td className="px-3 py-3 text-right font-mono text-amber-300">{formatCurrency(row.interest)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

function projectedBalance(loan: Loan, elapsedMonths: number) {
  let balance = Math.max(0, Number(loan.outstanding) || 0);
  const monthlyRate = Math.max(0, Number(loan.rate) || 0) / 1200;
  const payment = Math.max(0, Number(loan.emi) || 0);

  for (let month = 0; month < elapsedMonths && balance > 0; month += 1) {
    const interest = balance * monthlyRate;
    balance = Math.max(0, balance + interest - Math.min(balance + interest, payment));
  }
  return balance;
}

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}