import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import SectionCard from '../components/SectionCard';
import FloatingAI from '../components/FloatingAI';
import ConsolidationSimulator from '../components/ConsolidationSimulator';
import NotificationSection from '../components/NotificationSection';
import AddLoanModal from '../components/AddLoanModal';
import { api, buildProfileLoanFallback } from '../api/client';
import { Loan, TransactionSummary } from '../types';

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [txSummary, setTxSummary] = useState<TransactionSummary | null>(null);

  const [loans, setLoans] = useState<Loan[]>(() =>
    user ? buildProfileLoanFallback(user) : []
  );

  const handleLoanCreated = async (newLoan: Loan) => {
    setLoans((prev) => [newLoan, ...prev.filter((l) => l.id !== newLoan.id)]);
    await refreshUser();
  };

  useEffect(() => {
    if (!user) return;
    api.getTransactionSummary()
      .then((res) => setTxSummary(res.data))
      .catch((err) => console.warn('Failed to load transaction summary:', err));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoans([]);
      return;
    }

    let isCurrentRequest = true;
    const fallbackLoans = buildProfileLoanFallback(user);

    setLoans(fallbackLoans);

    api.getLoans()
      .then((response) => {
        if (!isCurrentRequest) return;

        const loadedLoans = Array.isArray(response.data)
          ? response.data
          : [];

        setLoans(loadedLoans.length ? loadedLoans : fallbackLoans);
      })
      .catch((error) => {
        if (!isCurrentRequest) return;

        console.error(
          'Failed to load loans for DebtLens simulator',
          error
        );

        setLoans(fallbackLoans);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [user]);

  if (!user) return null;

  const safeEmi = Math.min(
    user.monthly_income * 0.4 - user.monthly_emi,
    user.monthly_cashflow * 0.5
  );

  const emiItems = [
    {
      label: 'Total Monthly EMI',
      value: `₹${user.monthly_emi.toLocaleString('en-IN')}`,
    },
    {
      label: 'Active Loans',
      value: user.active_loan_count,
    },
    {
      label: 'Total Outstanding',
      value: `₹${user.existing_debt.toLocaleString('en-IN')}`,
    },
    {
      label: 'FOIR',
      value: `${user.foir_pct}%`,
    },
  ];

  const creditItems = [
    {
      label: 'Credit Health Score',
      value: `${user.cashflow_score}/100`,
    },
    {
      label: 'Health Band',
      value: user.risk_band,
    },
    {
      label: 'Monthly Surplus',
      value: `₹${user.monthly_cashflow.toLocaleString('en-IN')}`,
    },
    {
      label: 'Safe EMI Capacity',
      value: `₹${Math.round(safeEmi).toLocaleString('en-IN')}`,
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* HERO */}
        <section className="relative min-h-[360px] flex items-center overflow-hidden border-b border-white/[0.06] mb-12">

          <div className="absolute inset-0 pointer-events-none cm-scan">
            <div className="absolute left-[-120px] top-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-emerald-400/[0.08] blur-[130px]" />
            <div className="absolute right-[-80px] top-[-80px] w-[320px] h-[320px] bg-cyan-400/[0.06] blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-4xl cm-float">

            <div className="data-mono text-[10px] uppercase tracking-[0.3em] text-emerald-400/70 mb-6">
              CREDIMERGE / FINANCIAL INTELLIGENCE
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.06em] leading-[0.9] text-white...cm-interactive">
              Your money.
              <br />
              <span className="text-emerald-400...cm-interactive">
                Made visible.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base md:text-lg leading-relaxed text-slate-400">
              One financial intelligence layer for your loans, EMI burden,
              credit health and consolidation decisions.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={() => navigate('/emi')}
                className="px-6 py-3 bg-emerald-400 text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-emerald-300 transition-all duration-300"
              >
                Manage EMI →
              </button>

              <button
                onClick={() => navigate('/transactions')}
                className="px-6 py-3 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-[0.15em] hover:bg-emerald-400/10 transition-all duration-300"
              >
                Transactions & Cash Flow
              </button>

              <button
                onClick={() => navigate('/credit-health')}
                className="px-6 py-3 border border-white/[0.12] text-slate-300 text-xs font-bold uppercase tracking-[0.15em] hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-300"
              >
                Credit Health
              </button>
            </div>
          </div>

          {/* DATA MARKERS */}
          <div className="hidden lg:block absolute right-0 bottom-8 text-right cm-float">
            <div className="data-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
              LIVE FINANCIAL MODEL
            </div>

            <div className="data-mono text-3xl font-bold text-slate-300 mt-2 transition-all duration-500 hover:text-white hover:scale-105">
               {user.cashflow_score}
            <span className="text-emerald-400 text-sm ml-2 cm-pulse">
                / 100
            </span>
            </div>
            <div className="mt-3 h-px w-40 bg-gradient-to-r from-transparent via-emerald-400/50 to-emerald-400" />
          </div>
        </section>

        {/* CORE SIMULATOR */}
        <div className="cm-scan cm-border-glow">
            <ConsolidationSimulator loans={loans} user={user} />
        </div>
        {/* DASHBOARD */}
        <section className="mt-20">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="data-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400/60 mb-3">
                Financial Command Center
              </div>

              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                Dashboard
              </h2>

              <p className="text-slate-500 mt-2">
                Your complete financial picture at a glance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddLoanModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 hover:border-emerald-500/60"
              >
                + Add Loan
              </button>
              <div className="data-mono text-xs uppercase tracking-[0.15em] text-slate-600">
                SYSTEM / ACTIVE
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="cm-interactive cm-border-glow cm-scan">
                <SectionCard
                      icon="₹"
                       title="EMI Management"
                      accent="green"
                       items={emiItems}
                      ctaLabel="Open EMI Management →"
                      onOpen={() => navigate('/emi')}
                        />
          </div>

  <div className="cm-interactive cm-border-glow">
    <SectionCard
      icon="◎"
      title="Credit Health"
      accent="blue"
      items={creditItems}
      ctaLabel="Open Credit Health →"
      onOpen={() => navigate('/credit-health')}
    />
  </div>
</div>

          {/* REAL-TIME TRANSACTION STREAM PREVIEW */}
          <div className="mt-6 p-6 rounded-2xl border border-white/[0.08] bg-slate-950/60 cm-scan">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="data-mono text-[9px] uppercase tracking-[0.25em] text-cyan-400 font-mono">
                  LIVE ACTIVITY STREAM / TEE PROTECTED
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  Real-Time Transactions & Cash Flow
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Net Cash Flow</div>
                  <div
                    className={`font-mono font-bold text-sm ${
                      (txSummary?.netCashFlow || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    ₹{txSummary ? txSummary.netCashFlow.toLocaleString('en-IN') : '0'}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/transactions')}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition"
                >
                  View All Transactions →
                </button>
              </div>
            </div>

            {txSummary && txSummary.recentTransactions && txSummary.recentTransactions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {txSummary.recentTransactions.slice(0, 3).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white truncate max-w-[150px]">{tx.description}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        • {tx.category.replace('_', ' ')}
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-xs ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No recent transaction activity recorded yet.</p>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Link Sandbox Bank Account or Add Transaction →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* NOTIFICATIONS & INTELLIGENCE ALERTS */}
        <NotificationSection />

        {/* FINANCIAL SNAPSHOT */}
        <section className="cm-scan cm-border-glow cm-interactive mt-16 border border-white/[0.07] bg-slate-950/60 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/[0.04] blur-[100px] pointer-events-none" />

          <div className="relative">

            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="data-mono text-[10px] uppercase tracking-[0.25em] text-slate-600 mb-2">
                  DATA STREAM / 01
                </div>

                <h2 className="text-xl font-bold text-white">
                  Financial Snapshot
                </h2>
              </div>

              <div className="hidden sm:block data-mono text-[9px] text-emerald-400/50 uppercase tracking-[0.2em]">
                LIVE
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0">

              <SnapshotItem
                label="Monthly Income"
                value={`₹${user.monthly_income.toLocaleString('en-IN')}`}
                color="text-emerald-400"
              />

              <SnapshotItem
                label="Fixed Expenses"
                value={`₹${user.monthly_expenses.toLocaleString('en-IN')}`}
                color="text-rose-300"
              />

              <SnapshotItem
                label="Total EMI"
                value={`₹${user.monthly_emi.toLocaleString('en-IN')}`}
                color="text-amber-300"
              />

              <SnapshotItem
                label="Available Surplus"
                value={`₹${user.monthly_cashflow.toLocaleString('en-IN')}`}
                color="text-cyan-300"
              />

            </div>
          </div>
        </section>

        {/* FOOTER STATUS */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8 pb-10">
          <div className="data-mono text-[9px] uppercase tracking-[0.2em] text-slate-700">
            CREDIMERGE INTELLIGENCE ENGINE
          </div>

          <div className="data-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400/50">
            ● SYSTEM OPERATIONAL
          </div>
        </div>

      </main>

      <AddLoanModal
        isOpen={showAddLoanModal}
        onClose={() => setShowAddLoanModal(false)}
        onLoanCreated={handleLoanCreated}
      />

      <FloatingAI />
    </div>
  );
}

function SnapshotItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="relative px-4 md:px-6 py-4 first:pl-0 border-r border-white/[0.06] last:border-r-0">
      <div className="text-slate-500 text-[9px] uppercase tracking-[0.18em] mb-3">
        {label}
      </div>

      <div className={`text-xl md:text-2xl font-bold font-mono ${color}`}>
        {value}
      </div>

      <div className="mt-3 h-px w-8 bg-current opacity-40" />
    </div>
  );
}