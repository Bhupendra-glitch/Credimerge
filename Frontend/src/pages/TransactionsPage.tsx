import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Header from '../components/Header';
import FloatingAI from '../components/FloatingAI';
import AddTransactionModal from '../components/AddTransactionModal';
import ConnectAccountModal from '../components/ConnectAccountModal';
import TeeVerificationBadge from '../components/TeeVerificationBadge';
import TigerDataAnalytics from '../components/TigerDataAnalytics';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  Transaction,
  LinkedAccount,
  TransactionSummary,
  TransactionAdvisorInsights,
  TransactionCategory,
  TransactionType,
} from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  SALARY: '#10b981',
  LOAN_REPAYMENT: '#f59e0b',
  BILLS: '#06b6d4',
  GROCERIES: '#8b5cf6',
  SHOPPING: '#ec4899',
  ENTERTAINMENT: '#3b82f6',
  MEDICAL: '#ef4444',
  INVESTMENT: '#14b8a6',
  TRANSFER: '#64748b',
  OTHER: '#94a3b8',
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const currentUserId = user?.user_id || user?.userId || 'GIG1001';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [advisorInsights, setAdvisorInsights] = useState<TransactionAdvisorInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, accRes, sumRes, advRes] = await Promise.all([
        api.getTransactions({
          search: search.trim() || undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          page,
          limit: 15,
        }),
        api.getLinkedAccounts(),
        api.getTransactionSummary(),
        api.getTransactionInsights(),
      ]);

      setTransactions(txRes.data.transactions || []);
      setTotalPages(txRes.data.totalPages || 1);
      setTotalCount(txRes.data.totalCount || 0);
      setAccounts(accRes.data || []);
      setSummary(sumRes.data || null);
      setAdvisorInsights(advRes.data || null);
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, typeFilter, categoryFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSyncAccount = async (accountId: string) => {
    try {
      setSyncingId(accountId);
      const res = await api.syncAccount(accountId);
      setFeedbackMsg(`Synced ${res.data.syncedCount} new transactions. Balance updated.`);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Sync failed. Reconnect your bank account.';
      alert(msg);
    } finally {
      setSyncingId(null);
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      loadData();
    } catch (err) {
      alert('Unable to delete transaction.');
    }
  };

  const handleCategoryChange = async (id: string, newCat: TransactionCategory) => {
    try {
      await api.updateTransactionCategory(id, newCat);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, category: newCat, isUserConfirmedCategory: true } : t))
      );
      loadData();
    } catch (err) {
      alert('Failed to update category.');
    }
  };

  // Pie chart data from category breakdown
  const categoryChartData = summary
    ? Object.entries(summary.categoryBreakdown)
        .filter(([_, val]) => val > 0)
        .map(([key, val]) => ({
          name: key.replace('_', ' '),
          value: val,
          color: CATEGORY_COLORS[key] || '#94a3b8',
        }))
    : [];

  return (
    <div className="min-h-screen bg-[#030708] text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Top Header & TEE Status */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="data-mono text-[10px] uppercase tracking-[0.3em] text-emerald-400/80 mb-2">
              FINANCIAL INTELLIGENCE LAYER / TRANSACTIONS
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Financial Activity & Cash Flow
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time credit and debit tracking, recurring obligation intelligence, and consent-based Account Aggregator integration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TeeVerificationBadge />
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/20 transition flex items-center gap-2"
            >
              <span>+</span> Link Bank Account
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 transition flex items-center gap-2"
            >
              <span>+</span> Add Transaction
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <span>✓</span> {feedbackMsg}
          </div>
        )}

        {/* 1. Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/60 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Total Inflow (Credits)
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-emerald-400">
              ₹{summary ? summary.totalCredits.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-[10px] text-emerald-400/60 mt-2 font-mono">
              ↑ Verified Income & Deposits
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/60 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Total Outflow (Debits)
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-rose-400">
              ₹{summary ? summary.totalDebits.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-[10px] text-rose-400/60 mt-2 font-mono">
              ↓ Monthly Expenses & EMIs
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/60 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Net Cash Flow
            </div>
            <div
              className={`text-2xl lg:text-3xl font-black font-mono ${
                (summary?.netCashFlow || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              ₹{summary ? summary.netCashFlow.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              Surplus available for debt relief
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/60 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Monthly Spending
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-amber-300">
              ₹{summary ? summary.monthlySpending.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              Current cycle expenses
            </div>
          </div>
        </section>

        {/* 2. Linked Banking Accounts Bar */}
        <section className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono">
                Consent-Based Banking Connections
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">Linked Financial Accounts</h2>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              RBI AA / SANDBOX COMPLIANT
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center space-y-3">
              <p className="text-xs text-slate-400">
                No bank accounts linked yet. Connect an Account Aggregator sandbox account to automatically synchronize transactions.
              </p>
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition"
              >
                Connect Sandbox Account (HDFC / SBI / ICICI)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{acc.institutionName}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {acc.provider}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      {acc.accountNumberMask} • ₹{acc.balance.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Last synced: {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSyncAccount(acc.id)}
                    disabled={syncingId === acc.id}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:opacity-50 transition"
                  >
                    {syncingId === acc.id ? 'Syncing...' : '↻ Sync'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Advisor Insights & Recurring Obligation Intelligence */}
        {advisorInsights && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Obligation Detection */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-950/60 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-mono">
                    Advisor Intelligence
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Detected Recurring Obligations & EMIs
                  </h3>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Verified Income: ₹{advisorInsights.verifiedMonthlyIncome.amount.toLocaleString('en-IN')}
                </div>
              </div>

              {advisorInsights.unusualSpendingAlerts.length > 0 && (
                <div className="space-y-2">
                  {advisorInsights.unusualSpendingAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5"
                    >
                      <span className="text-base">⚠️</span>
                      <div>
                        <div className="font-bold">Attention Needed:</div>
                        <div className="text-[11px] text-amber-200 mt-0.5">{alert.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {advisorInsights.inferredLoanRepayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">
                  No recurring loan debits identified yet. As you record transactions or sync accounts, recurring EMIs will be automatically detected.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {advisorInsights.inferredLoanRepayments.map((inf) => (
                    <div
                      key={inf.id}
                      className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{inf.lenderOrMerchant}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {inf.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Detected Monthly Repayment • Confidence: {Math.round(inf.confidence * 100)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400 text-sm">
                          ₹{inf.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] text-slate-500">Every month</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-cyan-500/[0.05] border border-cyan-500/20 text-xs text-slate-300">
                <div className="font-bold text-cyan-300 mb-1">Consolidation Impact:</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {advisorInsights.consolidationImpact.advisoryRecommendation}
                </p>
                <div className="text-[9px] text-slate-500 mt-2 italic font-mono">
                  {advisorInsights.consolidationImpact.disclaimer}
                </div>
              </div>
            </div>

            {/* Category Breakdown Chart */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-950/60 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  Spending Distribution
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">Expense Categories</h3>
              </div>

              {categoryChartData.length > 0 ? (
                <div className="h-56 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#070b0e',
                          borderColor: '#334155',
                          fontSize: '11px',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No expense records yet to plot
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-2">
                {categoryChartData.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4. Tiger Data Time-Series Analytics & Forecasting */}
        <TigerDataAnalytics userId={currentUserId} refreshTrigger={transactions.length} />

        {/* 5. Transactions Table & Filters */}
        <section className="p-6 rounded-2xl border border-white/[0.08] bg-slate-950/60 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Transaction History</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {transactions.length} of {totalCount} records
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description or merchant..."
                className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none w-56"
              />

              {/* Type Filter */}
              <div className="flex rounded-xl border border-white/10 bg-black/40 p-0.5 text-xs">
                {(['ALL', 'DEBIT', 'CREDIT'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      typeFilter === t
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'DEBIT' ? 'Debits' : 'Credits'}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-xl border border-white/10 bg-[#070b0e] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="SALARY">Salary</option>
                <option value="LOAN_REPAYMENT">Loan Repayment</option>
                <option value="BILLS">Bills & Rent</option>
                <option value="GROCERIES">Groceries</option>
                <option value="SHOPPING">Shopping</option>
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="MEDICAL">Medical</option>
                <option value="INVESTMENT">Investment</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 font-mono">
              Loading financial transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-slate-400">No transactions match your current filter.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 transition"
              >
                + Record Your First Transaction
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-black/60 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Description / Narration</th>
                    <th className="py-3 px-4 text-left">Category</th>
                    <th className="py-3 px-4 text-left">Source</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{tx.description}</div>
                        {tx.merchantName && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{tx.merchantName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[tx.category] || '#64748b'}20`,
                            color: CATEGORY_COLORS[tx.category] || '#94a3b8',
                            border: `1px solid ${CATEGORY_COLORS[tx.category] || '#64748b'}40`,
                          }}
                        >
                          {tx.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            tx.source === 'SANDBOX'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : tx.source === 'LIVE'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {tx.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete transaction"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 disabled:opacity-40 transition"
              >
                ← Previous
              </button>
              <span className="text-xs font-mono text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onTransactionCreated={(newTx) => {
          setTransactions((prev) => [newTx, ...prev]);
          loadData();
        }}
      />

      <ConnectAccountModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onAccountConnected={(acc) => {
          setAccounts((prev) => [acc, ...prev]);
          loadData();
        }}
      />

      <FloatingAI />
    </div>
  );
}
