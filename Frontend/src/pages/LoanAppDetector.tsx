import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FloatingAI from '../components/FloatingAI';
import { api } from '../api/client';

type DetectorResult = {
  appName: string;
  riskScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  verdict: string;
  reasons: string[];
  saferSteps: string[];
};

export default function LoanAppDetector() {
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [website, setWebsite] = useState('');
  const [requestedPermissions, setRequestedPermissions] = useState('');
  const [repaymentDays, setRepaymentDays] = useState('');
  const [upfrontFee, setUpfrontFee] = useState(false);
  const [harassmentThreats, setHarassmentThreats] = useState(false);
  const [lenderLicenseConfirmed, setLenderLicenseConfirmed] = useState(false);
  const [result, setResult] = useState<DetectorResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const response = await api.checkLoanApp({
        appName,
        website,
        requestedPermissions,
        repaymentDays: repaymentDays ? Number(repaymentDays) : undefined,
        upfrontFee,
        harassmentThreats,
        lenderLicenseConfirmed,
      });
      setResult(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Unable to assess this loan app.');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = result?.riskLevel === 'Low'
    ? 'text-green-300 border-green-500/40 bg-green-500/10'
    : result?.riskLevel === 'Moderate'
      ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
      : 'text-red-300 border-red-500/40 bg-red-500/10';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/home')}
          className="text-slate-400 hover:text-slate-100 text-sm mb-4"
        >
          ← Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Predatory &amp; Illegal Loan App Detector</h1>
          <p className="text-slate-400 mt-2 max-w-3xl">
            Screen a loan app using observable warning signs before you share documents, contacts, or money.
            This is an early-warning tool, not an official legal determination.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-5">Check an app or lender</h2>
            <div className="space-y-4">
              <Field label="App or lender name" value={appName} onChange={setAppName} required placeholder="Example Finance" />
              <Field label="Official website (optional)" value={website} onChange={setWebsite} placeholder="https://example.com" />
              <Field
                label="Permissions requested"
                value={requestedPermissions}
                onChange={setRequestedPermissions}
                placeholder="Contacts, SMS, gallery..."
              />
              <Field
                label="Repayment period in days (optional)"
                value={repaymentDays}
                onChange={setRepaymentDays}
                type="number"
                min="1"
                placeholder="30"
              />
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Check label="They asked for an upfront fee" checked={upfrontFee} onChange={setUpfrontFee} />
              <Check label="I received threats or abusive collection messages" checked={harassmentThreats} onChange={setHarassmentThreats} />
              <Check label="The lender is verified or licensed" checked={lenderLicenseConfirmed} onChange={setLenderLicenseConfirmed} />
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Risk'}
            </button>
          </form>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
            {!result ? (
              <div className="h-full min-h-64 flex flex-col items-center justify-center text-center text-slate-400">
                <div className="text-5xl mb-4">🛡️</div>
                <h2 className="text-xl font-bold text-slate-200">Your assessment will appear here</h2>
                <p className="mt-2 text-sm max-w-sm">Provide the signs you observed. The detector will explain every warning in the result.</p>
              </div>
            ) : (
              <div>
                <div className={`rounded-xl border p-5 ${riskColor}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider opacity-80">Risk level</div>
                      <div className="text-3xl font-extrabold mt-1">{result.riskLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider opacity-80">Risk score</div>
                      <div className="text-3xl font-mono font-bold">{result.riskScore}/100</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm">{result.verdict}</p>
                </div>

                <h3 className="text-lg font-bold text-slate-100 mt-6 mb-3">Warning signals</h3>
                {result.reasons.length ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {result.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No warning signals were selected.</p>
                )}

                <h3 className="text-lg font-bold text-slate-100 mt-6 mb-3">Safer next steps</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {result.saferSteps.map((step) => <li key={step}>• {step}</li>)}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>
      <FloatingAI />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  min,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={min}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 accent-amber-500" />
      <span>{label}</span>
    </label>
  );
}
