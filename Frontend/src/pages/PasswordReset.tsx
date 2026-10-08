import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';

type Mode = 'request' | 'reset';

export default function PasswordReset({ mode }: { mode: Mode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'reset') {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match. Please verify both fields.');
        return;
      }
      const strength = evaluatePassword(newPassword);
      if (strength.score < 2) {
        setError('Please choose a stronger password that meets security standards.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'request') {
        const response = await api.requestPasswordReset(email.trim());
        setMessage(response.data.message);
      } else {
        const response = await api.resetPassword(token, newPassword, confirmPassword);
        setMessage(response.data.message);
      }
    } catch (requestError: unknown) {
      const responseError = (requestError as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      setError(typeof responseError === 'string' ? responseError : 'Unable to connect to the account service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasResetToken = mode !== 'reset' || /^[a-f0-9]{64}$/i.test(token);

  return (
    <main className="auth-scene relative isolate flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/80 text-slate-300 shadow-lg backdrop-blur-md hover:border-emerald-400 hover:text-emerald-400 transition"
        >
          {theme === 'dark' ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <section className="auth-card relative z-10 w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <Link to="/login" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition">
          ← Back to login
        </Link>
        <h1 className="auth-title mt-5 text-2xl font-bold text-slate-100">
          {mode === 'request' ? 'Reset your password' : 'Create a new password'}
        </h1>
        <p className="auth-subtitle mt-2 text-sm leading-6 text-slate-400">
          {mode === 'request'
            ? 'Enter the email address associated with your CrediMerge account. We will dispatch a secure reset link.'
            : 'Choose a new password of at least 8 characters. Reset links remain active for 30 minutes.'}
        </p>

        {!hasResetToken ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            ⚠️ This password reset link is invalid or expired. Please request a new link to continue.
            <div className="mt-3">
              <Link to="/forgot-password" className="font-bold underline text-amber-100 hover:text-white">
                Request a new reset link
              </Link>
            </div>
          </div>
        ) : message ? (
          <div role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 space-y-3">
            <p>✓ {message}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-bold text-white shadow-md hover:opacity-90 transition"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'request' ? (
              <div>
                <label className="auth-label block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  placeholder="you@example.com"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="auth-label block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-12 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Real-time Password Strength Meter */}
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                <div>
                  <label className="auth-label block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-12 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                  )}
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-95 disabled:cursor-wait disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Please wait…</span>
                </>
              ) : mode === 'request' ? (
                'Send Reset Link'
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
