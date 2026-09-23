import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { User } from '../types';

const demoUsers: Record<string, { password: string; user: User }> = {
  GIG1001: {
    password: 'GIG1001@123',
    user: {
      user_id: 'GIG1001', age: 47, worker_type: 'Driver', monthly_income: 47600,
      income_stability_score: 0.697, monthly_expenses: 28500, monthly_savings: 13400,
      existing_debt: 31400, monthly_emi: 2500, credit_card_balance: 19300,
      bnpl_balance: 6700, vehicle_loan_outstanding: 0, active_loan_count: 0,
      repayment_rate: 0.791, missed_payments_12m: 0, foir_pct: 5.25,
      monthly_cashflow: 16600, cashflow_score: 62.2, risk_band: 'Low Risk',
      forecast_30d_cashflow: 14940, forecast_60d_cashflow: 15459.98,
      forecast_90d_cashflow: 14904.94,
    },
  },
  GIG1002: {
    password: 'GIG1002@123',
    user: {
      user_id: 'GIG1002', age: 33, worker_type: 'Micro-Merchant', monthly_income: 40600,
      income_stability_score: 0.41, monthly_expenses: 26400, monthly_savings: 16000,
      existing_debt: 100300, monthly_emi: 3100, credit_card_balance: 13400,
      bnpl_balance: 4600, vehicle_loan_outstanding: 0, active_loan_count: 1,
      repayment_rate: 1, missed_payments_12m: 1, foir_pct: 7.64,
      monthly_cashflow: 11100, cashflow_score: 50.7, risk_band: 'Moderate Risk',
      forecast_30d_cashflow: 9990, forecast_60d_cashflow: 10329.62,
      forecast_90d_cashflow: 10804.17,
    },
  },
};

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(userId.trim().toUpperCase(), password);
      login(res.data.user, res.data.token);
      navigate('/home');
    } catch (err: any) {
      const demo = demoUsers[userId.trim().toUpperCase()];
      if (demo && demo.password === password) {
        login(demo.user, `demo-${demo.user.user_id.toLowerCase()}`);
        navigate('/home');
        return;
      }

      const message = err.response?.data?.error;
      setError(message || (err.response
        ? 'Login failed. Check your User ID and password.'
        : 'Login service unavailable. Set VITE_API_URL to the deployed backend URL.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            💸 CrediMerge
          </h1>
          <p className="text-slate-400 mt-4 text-lg">
            Smart Debt Management &amp; Credit Health
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Login</h2>

          <div className="mb-5">
            <label className="block text-slate-400 text-sm mb-2 font-medium">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="GIG1001"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 text-sm mb-2 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 pr-20 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-100"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : '🚀 Login'}
          </button>

          <div className="mt-6 text-center text-slate-500 text-sm">
            <p className="font-mono">Demo: GIG1001 / GIG1001@123</p>
          </div>
        </form>

        <p className="text-center text-slate-600 text-xs mt-8">
          © 2026 CrediMerge · Demo Prototype
        </p>
      </div>
    </div>
  );
}