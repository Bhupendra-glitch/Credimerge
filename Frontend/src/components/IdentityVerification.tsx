import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface VerificationRecord {
  id: string;
  verificationType: 'PAN' | 'GST' | 'BANK_ACCOUNT';
  status: 'VERIFIED' | 'FAILED';
  maskedIdentifier?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export default function IdentityVerification() {
  const { user, refreshUser } = useAuth();

  // PAN Form State
  const [pan, setPan] = useState('');
  const [nameAsPerPan, setNameAsPerPan] = useState('');
  const [panLoading, setPanLoading] = useState(false);
  const [panResult, setPanResult] = useState<any>(null);
  const [panError, setPanError] = useState('');

  // GST Form State
  const [gstin, setGstin] = useState('');
  const [gstLoading, setGstLoading] = useState(false);
  const [gstResult, setGstResult] = useState<any>(null);
  const [gstError, setGstError] = useState('');

  // Bank Form State
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankResult, setBankResult] = useState<any>(null);
  const [bankError, setBankError] = useState('');

  // Existing verifications & status
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [tigerConnected, setTigerConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'pan' | 'gst' | 'bank'>('pan');

  const fetchVerifications = async () => {
    try {
      const res = await api.getSandboxVerifications();
      if (res.data?.success && res.data?.data) {
        setVerifications(res.data.data.verifications || []);
      }
    } catch (err) {
      console.warn('Could not load existing verifications:', err);
    }
  };

  useEffect(() => {
    fetchVerifications();
    api.getSandboxStatus()
      .then((res) => {
        if (res.data?.tigerDataConnected !== undefined) {
          setTigerConnected(res.data.tigerDataConnected);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleVerifyPan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPanError('');
    setPanResult(null);

    const cleanPan = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setPanError('Please enter a valid 10-character PAN (e.g. ABCDE1234F).');
      return;
    }

    try {
      setPanLoading(true);
      const res = await api.verifyPAN({
        pan: cleanPan,
        nameAsPerPan: nameAsPerPan.trim() || undefined,
      });

      if (res.data.success && res.data.data) {
        setPanResult(res.data.data);
        await fetchVerifications();
        await refreshUser();
      } else {
        setPanError(res.data.data?.message || 'PAN verification was unsuccessful.');
      }
    } catch (err: any) {
      setPanError(err.response?.data?.error?.message || 'Verification service is temporarily unavailable. Please try again.');
    } finally {
      setPanLoading(false);
    }
  };

  const handleVerifyGst = async (e: React.FormEvent) => {
    e.preventDefault();
    setGstError('');
    setGstResult(null);

    const cleanGst = gstin.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      setGstError('Please enter a valid 15-character GSTIN (e.g. 29AAAAA0000A1Z5).');
      return;
    }

    try {
      setGstLoading(true);
      const res = await api.verifyGST({ gstin: cleanGst });

      if (res.data.success && res.data.data) {
        setGstResult(res.data.data);
        await fetchVerifications();
        await refreshUser();
      } else {
        setGstError(res.data.data?.message || 'GSTIN could not be verified.');
      }
    } catch (err: any) {
      setGstError(err.response?.data?.error?.message || 'Verification service is temporarily unavailable. Please try again.');
    } finally {
      setGstLoading(false);
    }
  };

  const handleVerifyBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError('');
    setBankResult(null);

    const cleanAcc = accountNumber.trim().replace(/\s+/g, '');
    const cleanIfsc = ifsc.trim().toUpperCase();

    if (!/^\d{9,18}$/.test(cleanAcc)) {
      setBankError('Account number must be 9 to 18 digits.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setBankError('Please enter a valid IFSC code (e.g. HDFC0000001).');
      return;
    }

    try {
      setBankLoading(true);
      const res = await api.verifyBankAccount({
        accountNumber: cleanAcc,
        ifsc: cleanIfsc,
      });

      if (res.data.success && res.data.data) {
        setBankResult(res.data.data);
        await fetchVerifications();
        await refreshUser();
      } else {
        setBankError(res.data.data?.message || 'Bank account verification failed.');
      }
    } catch (err: any) {
      setBankError(err.response?.data?.error?.message || 'Verification service is temporarily unavailable. Please try again.');
    } finally {
      setBankLoading(false);
    }
  };

  const panRecord = verifications.find((v) => v.verificationType === 'PAN' && v.status === 'VERIFIED');
  const gstRecord = verifications.find((v) => v.verificationType === 'GST' && v.status === 'VERIFIED');
  const bankRecord = verifications.find((v) => v.verificationType === 'BANK_ACCOUNT' && v.status === 'VERIFIED');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h2 className="text-lg font-bold text-slate-100">Identity & Financial Verification</h2>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-300">
              SANDBOX TEST
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time KYC, tax, and banking validation via Sandbox.co.in APIs. Verified signals securely feed your CrediMerge trust profile & Tiger Data analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
              tigerConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title="TimescaleDB audit stream status"
          >
            <span className={`w-2 h-2 rounded-full ${tigerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            Tiger Data {tigerConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Verification Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('pan')}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
            activeTab === 'pan'
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-xs text-slate-400 font-medium">PAN Card</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {panRecord ? panRecord.maskedIdentifier : 'Not Verified'}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            panRecord ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {panRecord ? '✓ Verified' : 'Verify'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst')}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
            activeTab === 'gst'
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-xs text-slate-400 font-medium">GSTIN Taxpayer</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {gstRecord ? gstRecord.maskedIdentifier : 'Optional'}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            gstRecord ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {gstRecord ? '✓ Verified' : 'Verify'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
            activeTab === 'bank'
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-xs text-slate-400 font-medium">Bank Account (Penny Drop)</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {bankRecord ? bankRecord.maskedIdentifier : 'Not Verified'}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            bankRecord ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {bankRecord ? '✓ Verified' : 'Verify'}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'pan' && (
        <form onSubmit={handleVerifyPan} className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>💳</span> PAN Verification
            </h3>
            {panRecord && (
              <span className="text-xs text-emerald-400 font-medium">✓ Currently Verified ({panRecord.maskedIdentifier})</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Validates your Permanent Account Number directly against government records via Sandbox.co.in KYC services.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PAN Number *</label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 uppercase tracking-wider placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Name as per PAN (Optional)</label>
              <input
                type="text"
                placeholder="Full Name"
                value={nameAsPerPan}
                onChange={(e) => setNameAsPerPan(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {panError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              ⚠️ {panError}
            </div>
          )}

          {panResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
              <div className="font-semibold text-sm">✓ {panResult.message}</div>
              <div>Masked PAN: <span className="font-mono">{panResult.maskedIdentifier}</span></div>
              {panResult.category && <div>Category: {panResult.category}</div>}
              <div>Reference ID: <span className="font-mono">{panResult.referenceId}</span></div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={panLoading}
              className="rounded-lg bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {panLoading ? 'Verifying with Sandbox...' : 'Verify PAN'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'gst' && (
        <form onSubmit={handleVerifyGst} className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>🏢</span> GSTIN Verification
            </h3>
            {gstRecord && (
              <span className="text-xs text-emerald-400 font-medium">✓ Currently Verified ({gstRecord.maskedIdentifier})</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Validates business GSTIN, filing status, trade name, and legal entity compliance.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">GSTIN Number *</label>
            <input
              type="text"
              placeholder="e.g. 29AAAAA0000A1Z5"
              maxLength={15}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 uppercase tracking-wider placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {gstError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              ⚠️ {gstError}
            </div>
          )}

          {gstResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
              <div className="font-semibold text-sm">✓ {gstResult.message}</div>
              {gstResult.tradeName && <div>Trade Name: <span className="font-semibold">{gstResult.tradeName}</span></div>}
              {gstResult.legalName && <div>Legal Name: {gstResult.legalName}</div>}
              <div>Taxpayer Status: <span className="font-mono text-emerald-400">{gstResult.taxpayerStatus}</span></div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={gstLoading}
              className="rounded-lg bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {gstLoading ? 'Verifying with Sandbox...' : 'Verify GSTIN'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'bank' && (
        <form onSubmit={handleVerifyBank} className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>🏦</span> Bank Account Verification
            </h3>
            {bankRecord && (
              <span className="text-xs text-emerald-400 font-medium">✓ Currently Verified ({bankRecord.maskedIdentifier})</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Performs an automated Penny Drop verification to validate account existence and registered account holder name.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Number *</label>
              <input
                type="text"
                placeholder="Enter Account Number"
                maxLength={18}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">IFSC Code *</label>
              <input
                type="text"
                placeholder="e.g. HDFC0000001"
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 uppercase placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          {bankError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              ⚠️ {bankError}
            </div>
          )}

          {bankResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
              <div className="font-semibold text-sm">✓ {bankResult.message}</div>
              {bankResult.accountHolderName && (
                <div>Registered Holder Name: <span className="font-semibold">{bankResult.accountHolderName}</span></div>
              )}
              <div>Account Mask: <span className="font-mono">{bankResult.maskedIdentifier}</span></div>
              <div>IFSC: <span className="font-mono">{bankResult.ifsc}</span></div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={bankLoading}
              className="rounded-lg bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {bankLoading ? 'Verifying Penny Drop...' : 'Verify Bank Account'}
            </button>
          </div>
        </form>
      )}

      {/* Verification Audit Stream (Logged into TimescaleDB / Tiger Data & Supabase) */}
      {verifications.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <span>📜</span> Recent Verification Audit Log (Tiger Data TimescaleDB)
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {verifications.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300">{v.verificationType}</span>
                  <span className="font-mono text-slate-400">{v.maskedIdentifier || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    v.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}>
                    {v.status}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
