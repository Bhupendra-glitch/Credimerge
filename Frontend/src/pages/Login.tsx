import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.data?.error || 'Login failed. Try again.');
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
              required
            />
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