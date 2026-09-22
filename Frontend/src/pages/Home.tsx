import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import SectionCard from '../components/SectionCard';
import FloatingAI from '../components/FloatingAI';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!user) return null;

  const safeEmi = Math.min(
    user.monthly_income * 0.4 - user.monthly_emi,
    user.monthly_cashflow * 0.5
  );

  const emiItems = [
    { label: t('totalEmi'), value: `₹${user.monthly_emi.toLocaleString('en-IN')}` },
    { label: 'Active Loans', value: user.active_loan_count },
    { label: 'Total Outstanding', value: `₹${user.existing_debt.toLocaleString('en-IN')}` },
    { label: 'FOIR', value: `${user.foir_pct}%` },
  ];

  const creditItems = [
    { label: t('creditHealth'), value: `${user.cashflow_score}/100` },
    { label: 'Health Band', value: user.risk_band },
    { label: 'Monthly Surplus', value: `₹${user.monthly_cashflow.toLocaleString('en-IN')}` },
    { label: 'Safe EMI Capacity', value: `₹${Math.round(safeEmi).toLocaleString('en-IN')}` },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">{t('dashboard')}</h1>
          <p className="text-slate-400 mt-1">
            {t('dashboardSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SectionCard
            icon="💳"
            title={t('emiManagement')}
            accent="green"
            items={emiItems}
            ctaLabel={`${t('openEmiManagement')} →`}
            onOpen={() => navigate('/emi')}
          />
          <SectionCard
            icon="🧾"
            title={t('creditHealth')}
            accent="blue"
            items={creditItems}
            ctaLabel={`${t('openCreditHealth')} →`}
            onOpen={() => navigate('/credit-health')}
          />
          <SectionCard
            icon="🛡️"
            title="Loan App Detector"
            accent="blue"
            items={[
              { label: 'Screening', value: 'App & lender risks' },
              { label: 'Signals', value: 'Permissions, fees, threats' },
              { label: 'Result', value: 'Explainable risk score' },
            ]}
            ctaLabel="Check Loan App →"
            onOpen={() => navigate('/loan-app-detector')}
          />
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6">
            📊 {t('financialSnapshot')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SnapshotItem
              label={t('monthlyIncome')}
              value={`₹${user.monthly_income.toLocaleString('en-IN')}`}
              color="text-green-400"
            />
            <SnapshotItem
              label={t('fixedExpenses')}
              value={`₹${user.monthly_expenses.toLocaleString('en-IN')}`}
              color="text-red-400"
            />
            <SnapshotItem
              label={t('totalEmi')}
              value={`₹${user.monthly_emi.toLocaleString('en-IN')}`}
              color="text-amber-400"
            />
            <SnapshotItem
              label={t('availableSurplus')}
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