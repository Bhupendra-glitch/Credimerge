import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import { CashFlowPoint, FinancialForecast, TigerHealthStatus } from '../types';

interface TigerDataAnalyticsProps {
  userId: string;
  refreshTrigger?: number;
}

export default function TigerDataAnalytics({ userId, refreshTrigger }: TigerDataAnalyticsProps) {
  const [health, setHealth] = useState<TigerHealthStatus | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [forecast, setForecast] = useState<FinancialForecast | null>(null);
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');
  const [selectedHorizon, setSelectedHorizon] = useState<'30' | '60' | '90'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTigerData() {
      if (!userId) return;
      try {
        setLoading(true);
        const [healthRes, cfRes, fcRes] = await Promise.allSettled([
          api.getTigerHealth(),
          api.getCashFlow(userId, interval),
          api.getFinancialForecast(userId),
        ]);

        if (!isMounted) return;

        if (healthRes.status === 'fulfilled') {
          setHealth(healthRes.value.data);
        } else {
          setHealth({ success: false, service: 'tiger-data', database: 'disconnected' });
        }

        if (cfRes.status === 'fulfilled' && cfRes.value.data?.success) {
          setCashFlow(cfRes.value.data.data || []);
        }

        if (fcRes.status === 'fulfilled' && fcRes.value.data?.success) {
          setForecast(fcRes.value.data.data || null);
        }
      } catch (err) {
        console.warn('Failed to load Tiger Data time-series analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTigerData();

    return () => {
      isMounted = false;
    };
  }, [userId, interval, refreshTrigger]);

  const activeProjection =
    selectedHorizon === '30'
      ? forecast?.days30
      : selectedHorizon === '60'
      ? forecast?.days60
      : forecast?.days90;

  return (
    <section className="p-6 rounded-2xl border border-white/[0.08] bg-slate-950/60 space-y-6 relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400">
              TIME-SERIES FINANCIAL ENGINE
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                health?.database === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  health?.database === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              🐯 Tiger Data (TimescaleDB): {health?.database === 'connected' ? 'Connected' : 'Offline'}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
            High-Volume Cash Flow & Multi-Horizon Forecasting
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Powered by TimescaleDB hypertables, automated bucket aggregation, and predictive volatility modeling.
          </p>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 self-start md:self-auto">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInterval(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition ${
                interval === mode
                  ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Cash Flow Time Series Chart + 30/60/90 Day Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px]">
              Cash Flow Trend ({interval.toUpperCase()})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {cashFlow.length} time buckets recorded
            </span>
          </div>

          <div className="h-64 w-full bg-black/40 rounded-xl p-3 border border-white/5">
            {cashFlow.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <span>No time-bucketed transactions recorded yet in Tiger Data.</span>
                <span className="text-[11px] text-slate-600 mt-1">
                  Add transactions or link an account to view live historical curves.
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(val) => (val.includes('-') ? val.slice(5) : val)}
                  />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030708',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="income" name="Income (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses (₹)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netCashFlow" name="Net Cash Flow (₹)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 30/60/90 Day Forecast Card */}
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400">
                Predictive Analytics
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                  forecast?.riskBand === 'LOW'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : forecast?.riskBand === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {forecast?.riskBand || 'MODERATE'} RISK
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Financial Horizon Forecast</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-day linear cash flow modeling based on Tiger Data historical run-rates.
            </p>

            {/* Horizon Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-white/5 mt-3">
              {(['30', '60', '90'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`py-1 text-[11px] font-mono rounded transition ${
                    selectedHorizon === h
                      ? 'bg-amber-400 text-black font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {h} Days
                </button>
              ))}
            </div>
          </div>

          {/* Active Projection Metrics */}
          <div className="space-y-2.5 bg-slate-950/80 p-3.5 rounded-lg border border-white/5 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Projected Income</span>
              <span className="font-bold text-emerald-400">
                ₹{activeProjection ? activeProjection.projectedIncome.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Projected Outflow</span>
              <span className="font-bold text-rose-400">
                ₹{activeProjection ? activeProjection.projectedExpenses.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-white font-semibold">Net Savings Surplus</span>
              <span
                className={`font-bold ${
                  (activeProjection?.projectedNetSavings || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                ₹{activeProjection ? activeProjection.projectedNetSavings.toLocaleString('en-IN') : '0'}
              </span>
            </div>
          </div>

          {/* Volatility & Run-Rate stats */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div className="p-2 rounded bg-white/[0.02] border border-white/5">
              <div>Daily Run Rate</div>
              <div className="text-xs font-bold text-white mt-0.5">
                ₹{forecast ? forecast.averageDailyIncome.toLocaleString('en-IN') : '0'}/day
              </div>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/5">
              <div>Income Volatility</div>
              <div className="text-xs font-bold text-amber-300 mt-0.5">
                {forecast?.incomeVolatilityPercent || 0}% CV
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
