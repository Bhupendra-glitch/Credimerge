import { useState } from 'react';
import { api } from '../api/client';
import { LinkedAccount } from '../types';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountConnected: (account: LinkedAccount) => void;
}

const INSTITUTIONS = [
  { name: 'HDFC Bank', code: 'HDFC', type: 'Primary Banking / Salary' },
  { name: 'State Bank of India', code: 'SBI', type: 'Savings & Public Sector' },
  { name: 'ICICI Bank', code: 'ICICI', type: 'Retail & Loan Account' },
  { name: 'Axis Bank', code: 'AXIS', type: 'Credit Line & Current' },
];

export default function ConnectAccountModal({
  isOpen,
  onClose,
  onAccountConnected,
}: ConnectAccountModalProps) {
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [consentApproved, setConsentApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentApproved) {
      setError('Please review and agree to the consent terms before connecting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.connectSandboxAccount(selectedBank);
      onAccountConnected(res.data.account);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to connect financial account.');
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
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-mono">
              Account Aggregator / Sandbox
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
              Link Banking Data
            </h2>
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

        <form onSubmit={handleConnect} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Financial Institution
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {INSTITUTIONS.map((inst) => (
                <button
                  key={inst.name}
                  type="button"
                  onClick={() => setSelectedBank(inst.name)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedBank === inst.name
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-white shadow-sm'
                      : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs">{inst.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{inst.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Consent Disclosure Box */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 text-xs space-y-2 text-slate-300">
            <div className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <span>🔒</span> Consent-Based Access Disclosure
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              In accordance with the RBI Account Aggregator framework, CrediMerge accesses only:
            </p>
            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1 pl-1">
              <li>Read-only Transaction History & Balance Statements</li>
              <li>Encrypted data transfer via TLS 1.3 & TEE Secure Enclave</li>
              <li>Validity: 90 days (can be revoked by you at any time)</li>
            </ul>
            <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] text-emerald-400 font-mono">
              ✓ ZERO Credential Storage: We NEVER ask for or store passwords, PINs, OTPs, or CVVs.
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={consentApproved}
              onChange={(e) => setConsentApproved(e.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-black/40 text-emerald-400 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300">
              I authorize CrediMerge to fetch read-only transaction data for financial consolidation analysis under the Account Aggregator sandbox agreement.
            </span>
          </label>

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
              disabled={loading || !consentApproved}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 disabled:opacity-40 transition"
            >
              {loading ? 'Connecting...' : 'Authorize & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
