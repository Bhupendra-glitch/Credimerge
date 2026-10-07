import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

type Mode = 'request' | 'reset';

export default function PasswordReset({ mode }: { mode: Mode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
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
    <main className="auth-scene relative isolate flex min-h-screen items-center justify-center px-4 py-10">
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
        <Link to="/login" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          ← Back to login
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-100">
          {mode === 'request' ? 'Reset your password' : 'Choose a new password'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {mode === 'request'
            ? 'Enter the email address associated with your account. If it matches an account, we will email you a secure reset link.'
            : 'Choose a new password of at least 12 characters. Reset links expire after 30 minutes.'}
        </p>

        {!hasResetToken ? (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            This password reset link is missing or invalid. Request a new link to continue.
          </div>
        ) : message ? (
          <div role="status" className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === 'request' ? (
              <label className="block text-sm font-medium text-slate-300">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                  placeholder="you@example.com"
                />
              </label>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-300">
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-300">
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-green-500 to-blue-500 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'request' ? 'Send reset link' : 'Reset password'}
            </button>
          </form>
        )}

        {message && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-5 w-full rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 hover:border-cyan-400"
          >
            Return to login
          </button>
        )}
      </section>
    </main>
  );
}
