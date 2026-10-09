import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loan } from '../types';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoanCreated: (loan: Loan) => void;
}

const loanTypes = [
  'Personal Loan',
  'Credit Card',
  'BNPL',
  'Vehicle Loan',
  'Home Loan',
  'Education Loan',
  'Gold Loan',
  'Consumer Loan',
  'Other',
];

export default function AddLoanModal({
  isOpen,
  onClose,
  onLoanCreated,
}: AddLoanModalProps) {
  const [type, setType] = useState('Personal Loan');
  const [lender, setLender] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [rate, setRate] = useState('14.0');
  const [tenure, setTenure] = useState('24');
  const [emi, setEmi] = useState('');
  const [autoEmi, setAutoEmi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate EMI when principal, rate, or tenure changes
  useEffect(() => {
    if (!autoEmi) return;
    const p = Number(outstanding);
    const r = Number(rate) / 1200;
    const n = Number(tenure);

    if (p > 0 && n > 0) {
      if (r === 0) {
        setEmi((p / n).toFixed(2));
      } else {
        const factor = Math.pow(1 + r, n);
        const calculated = (p * r * factor) / (factor - 1);
        setEmi(calculated.toFixed(2));
      }
    } else {
      setEmi('');
    }
  }, [outstanding, rate, tenure, autoEmi]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const principal = Number(outstanding);
    const annualRate = Number(rate);
    const months = Number(tenure);
    const monthlyEmi = Number(emi);

    if (!lender.trim()) {
      setError('Please specify the lender or bank name.');
      return;
    }
    if (!principal || principal <= 0) {
      setError('Please enter a valid outstanding balance greater than 0.');
      return;
    }
    if (annualRate < 0 || annualRate > 100) {
      setError('Please enter a valid interest rate between 0% and 100%.');
      return;
    }
    if (!months || months <= 0) {
      setError('Please enter a valid tenure in months.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createLoan({
        type,
        lender: lender.trim(),
        outstanding: principal,
        rate: annualRate,
        tenure: months,
        emi: monthlyEmi > 0 ? monthlyEmi : undefined,
      });

      onLoanCreated(res.data);
      onClose();
      // Reset form
      setLender('');
      setOutstanding('');
      setRate('14.0');
      setTenure('24');
      setEmi('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save loan. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-lg">
              💳
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Add New Loan</h2>
              <p className="text-xs text-slate-400">Stores directly to your individual account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Loan Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                {loanTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Lender / Bank Name
              </label>
              <input
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. HDFC, SBI, Simpl"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Outstanding (₹)
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
                placeholder="50000"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Interest Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="14.0"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tenure (Months)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="24"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Monthly EMI (₹)
              </label>
              <button
                type="button"
                onClick={() => setAutoEmi(!autoEmi)}
                className="text-xs text-emerald-400 hover:underline"
              >
                {autoEmi ? 'Customize EMI manually' : 'Auto-calculate EMI'}
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={emi}
              onChange={(e) => {
                setAutoEmi(false);
                setEmi(e.target.value);
              }}
              placeholder="e.g. 2412"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
