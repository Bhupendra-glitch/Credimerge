import { useState } from 'react';
import { api } from '../api/client';
import { Transaction, TransactionCategory, TransactionType } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: (transaction: Transaction) => void;
}

const CATEGORIES: Array<{ value: TransactionCategory; label: string }> = [
  { value: 'SALARY', label: 'Salary / Income' },
  { value: 'LOAN_REPAYMENT', label: 'Loan Repayment / EMI' },
  { value: 'BILLS', label: 'Utility Bills / Rent' },
  { value: 'GROCERIES', label: 'Groceries & Essentials' },
  { value: 'SHOPPING', label: 'Shopping & Retail' },
  { value: 'ENTERTAINMENT', label: 'Entertainment & Subscriptions' },
  { value: 'MEDICAL', label: 'Medical & Healthcare' },
  { value: 'INVESTMENT', label: 'Investment & Savings' },
  { value: 'TRANSFER', label: 'Transfer / Other' },
  { value: 'OTHER', label: 'Other Expenses' },
];

export default function AddTransactionModal({
  isOpen,
  onClose,
  onTransactionCreated,
}: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('GROCERIES');
  const [description, setDescription] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid transaction amount.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description or narration.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createTransaction({
        type,
        amount: numAmount,
        category,
        description: description.trim(),
        merchantName: merchantName.trim() || undefined,
        transactionDate: new Date(transactionDate).toISOString(),
        source: 'MANUAL',
      });

      const newTx = res.data.transaction as Transaction;
      onTransactionCreated(newTx);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to record transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#070b0e] p-6 shadow-2xl text-slate-100"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Record Transaction</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manually add credit or debit record</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Transaction Flow
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('DEBIT');
                  if (category === 'SALARY') setCategory('GROCERIES');
                }}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 ${
                  type === 'DEBIT'
                    ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-sm'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                <span>↓</span> Outgoing Debit
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('CREDIT');
                  setCategory('SALARY');
                }}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 ${
                  type === 'CREDIT'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-sm'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                <span>↑</span> Incoming Credit
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full rounded-xl border border-white/10 bg-[#0d141b] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description / Narration *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Swiggy food delivery or HDFC Loan EMI"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Merchant & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Merchant / Lender
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. Swiggy, HDFC"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 disabled:opacity-50 transition"
            >
              {loading ? 'Recording...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
