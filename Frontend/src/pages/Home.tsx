import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import SectionCard from '../components/SectionCard';
import FloatingAI from '../components/FloatingAI';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const safeEmi = Math.min(
    user.monthly_income * 0.4 - user.monthly_emi,
    user.monthly_cashflow * 0.5
  );

  const emiItems = [
    { label: 'Total Monthly EMI', value: `₹${user.monthly_emi.toLocaleString('en-IN')}` },
    { label: 'Active Loans', value: user.active_loan_count },
    { label: 'Total Outstanding', value: `₹${user.existing_debt.toLocaleString('en-IN')}` },
    { label: 'FOIR', value: `${user.foir_pct}%` },
  ];

  const creditItems = [
    { label: 'Credit Health Score', value: `${user.cashflow_score}/100` },
    { label: 'Health Band', value: user.risk_band },
    { label: 'Monthly Surplus', value: `₹${user.monthly_cashflow.toLocaleString('en-IN')}` },
    { label: 'Safe EMI Capacity', value: `₹${Math.round(safeEmi).toLocaleString('en-IN')}` },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Your complete financial picture at a glance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SectionCard
            icon="💳"
            title="EMI Management"
            accent="green"
            items={emiItems}
            ctaLabel="Open EMI Management →"
            onOpen={() => navigate('/emi')}
          />
          <SectionCard
            icon="🧾"
            title="Credit Health"
            accent="blue"
            items={creditItems}
            ctaLabel="Open Credit Health →"
            onOpen={() => navigate('/credit-health')}
          />
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6">
            📊 Your Financial Snapshot
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SnapshotItem
              label="Monthly Income"
              value={`₹${user.monthly_income.toLocaleString('en-IN')}`}
              color="text-green-400"
            />
            <SnapshotItem
              label="Fixed Expenses"
              value={`₹${user.monthly_expenses.toLocaleString('en-IN')}`}
              color="text-red-400"
            />
            <SnapshotItem
              label="Total EMI"
              value={`₹${user.monthly_emi.toLocaleString('en-IN')}`}
              color="text-amber-400"
            />
            <SnapshotItem
              label="Available Surplus"
              value={`₹${user.monthly_cashflow.toLocaleString('en-IN')}`}
              color="text-blue-400"
            />
          </div>
        </div>
      </main>

      <FloatingAI />
    </div>
  );
}

function SnapshotItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}