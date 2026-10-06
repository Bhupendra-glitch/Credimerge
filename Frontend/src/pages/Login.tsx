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

    const normalizedUserId = userId.trim().toUpperCase();
    const demo = demoUsers[normalizedUserId];
    if (demo && demo.password === password) {
      login(demo.user, `demo-${demo.user.user_id.toLowerCase()}`);
      navigate('/home');
      setLoading(false);
      return;
    }

    try {
      const res = await api.login(normalizedUserId, password);
      login(res.data.user, res.data.token);
      navigate('/home');
    } catch (err: any) {
      const message = err.response?.data?.error;
      setError(message || (err.response
        ? 'Login failed. Check your User ID and password.'
        : 'Login service unavailable. Set VITE_API_URL to the deployed backend URL.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-scene relative isolate min-h-screen flex items-center justify-center px-4 py-10">
      <svg
        className="auth-backdrop"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="auth-line" x1="120" y1="120" x2="1320" y2="780" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" />
            <stop offset="1" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        <g className="auth-art-float" stroke="url(#auth-line)" strokeWidth="1.5">
          <g opacity=".2" transform="translate(105 150) rotate(-12)">
            <rect width="176" height="112" rx="12" />
            <path d="M1 31h174M18 81h45m-45 13h75" />
            <circle cx="148" cy="84" r="10" />
          </g>
          <g opacity=".17" transform="translate(1150 635) rotate(12)">
            <rect width="178" height="112" rx="12" />
            <path d="M1 31h176M18 81h45m-45 13h75" />
            <circle cx="150" cy="84" r="10" />
          </g>
          <g opacity=".2" transform="translate(1130 186)">
            <circle cx="72" cy="72" r="57" strokeDasharray="5 8" />
            <circle cx="72" cy="72" r="42" />
            <path d="M72 72 99 48M72 72V34" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 91a28 28 0 0 0 39-2" />
          </g>
          <g opacity=".17" transform="translate(90 620)">
            <path d="M0 142h198M12 142V87h26v55m13 0V52h26v90m13 0V76h26v66m13 0V20h26v122m13 0V60h26v82" />
            <path className="auth-chart-line" d="m8 72 48-27 46 19 44-48 44 22" strokeWidth="2" />
          </g>
          <g opacity=".19" transform="translate(1190 410)">
            <path d="M20 28 70 0l50 28v5H20zm9 8v48m27-48v48m28-48v48m27-48v48M17 88h106v9H17z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 116h144m-120 0v17m96-17v17M9 140h126" />
          </g>
          <g opacity=".16" transform="translate(290 760)">
            <path d="M22 0 44 8v19c0 18-11 31-22 38C11 58 0 45 0 27V8z" strokeLinejoin="round" />
            <path d="m12 29 7 7 14-16" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g opacity=".19" transform="translate(1040 770)">
            <circle cx="0" cy="0" r="7" /><circle cx="74" cy="-28" r="7" />
            <circle cx="119" cy="33" r="7" /><circle cx="53" cy="62" r="7" />
            <path d="m7-3 60-22m11 3 36 49m-3 9-51 22m-7-7-48-47" />
          </g>
          <g className="auth-network" opacity=".13">
            <path d="m350 180 106 74 95-48 97 98 106-66 104 85m-502 9 98 63 100-91 94 93 104-44 103 59" />
            <circle cx="350" cy="180" r="4" fill="#34d399" /><circle cx="456" cy="254" r="4" fill="#34d399" />
            <circle cx="551" cy="206" r="4" fill="#60a5fa" /><circle cx="648" cy="304" r="4" fill="#34d399" />
            <circle cx="754" cy="238" r="4" fill="#60a5fa" /><circle cx="858" cy="323" r="4" fill="#34d399" />
            <circle cx="360" cy="395" r="4" fill="#60a5fa" /><circle cx="458" cy="458" r="4" fill="#34d399" />
            <circle cx="558" cy="367" r="4" fill="#60a5fa" /><circle cx="652" cy="460" r="4" fill="#34d399" />
            <circle cx="756" cy="416" r="4" fill="#60a5fa" /><circle cx="859" cy="475" r="4" fill="#34d399" />
          </g>
        </g>
        <g className="auth-data" fill="#94a3b8" fontFamily="monospace" fontSize="11" opacity=".17">
          <text x="72" y="352">+12.8%  08:42  INR</text>
          <text x="1090" y="116">₹ 24,850.00</text>
          <text x="1030" y="555">TXN 00482  CREDIT</text>
          <text x="360" y="720">01  10  11  01  00  10</text>
        </g>
      </svg>
      <div className="relative z-10 w-full max-w-md">
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