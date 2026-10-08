import React, { useState } from 'react';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; name: string; picture?: string; avatar?: string }) => void;
  isLoading?: boolean;
}

const suggestedAccounts = [
  {
    name: 'Alex Mercer',
    email: 'alex.mercer@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face',
    workerType: 'Freelance Courier',
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
    workerType: 'Micro-Merchant',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
    workerType: 'Ride-share Driver',
  },
];

export default function GoogleAccountModal({
  isOpen,
  onClose,
  onSelectAccount,
  isLoading,
}: GoogleAccountModalProps) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) return;
    onSelectAccount({
      email: customEmail.trim(),
      name: customName.trim() || customEmail.split('@')[0],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google Branding Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Sign in with Google
              </h2>
              <p className="text-xs text-slate-400">
                to continue to CrediMerge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-300 mb-4 font-medium">
            Choose an account to sign in:
          </p>

          <div className="space-y-2.5">
            {suggestedAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={isLoading}
                onClick={() => onSelectAccount(account)}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-700/70 bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/50 transition text-left group disabled:opacity-50"
              >
                <img
                  src={account.avatar}
                  alt={account.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600 group-hover:border-emerald-400 transition"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition truncate">
                    {account.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {account.email}
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hidden sm:inline-block">
                  Instant
                </span>
              </button>
            ))}
          </div>

          {/* Toggle custom Google Account */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition py-1"
              >
                + Use another Google account
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Jordan Lee)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="flex-1 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Signing in...' : 'Continue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-950/60 px-6 py-3 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
          CrediMerge will receive your name, email address, and profile picture.
        </div>
      </div>
    </div>
  );
}
