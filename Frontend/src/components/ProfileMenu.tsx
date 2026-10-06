import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loan } from '../types';

type ProfilePanel = 'profile' | 'settings' | 'password' | 'financial';
type ProfileDraft = { fullName: string; email: string; phone: string };

const menuItems: Array<{ panel: ProfilePanel; label: string; icon: string }> = [
  { panel: 'profile', label: 'Profile', icon: '👤' },
  { panel: 'settings', label: 'Account Settings', icon: '⚙️' },
  { panel: 'password', label: 'Change Password', icon: '🔐' },
  { panel: 'financial', label: 'Financial Profile', icon: '📊' },
];

function getErrorMessage(error: unknown, fallback: string) {
  const responseError = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof responseError === 'string' ? responseError : fallback;
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatCreatedAt(value: unknown) {
  if (!value) return 'Not available';
  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === 'function') value = timestamp.toDate();
    else {
      const seconds = timestamp.seconds ?? timestamp._seconds;
      if (typeof seconds === 'number') value = seconds * 1000;
    }
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initialsFor(name: string) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
  return initials.toUpperCase() || 'U';
}

export default function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const { user, updateUser } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<ProfilePanel | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>({ fullName: '', email: '', phone: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loanError, setLoanError] = useState('');

  const displayName = user?.fullName?.trim() || user?.user_id || user?.userId || 'User';
  const userId = user?.user_id || user?.userId || 'Not available';

  useEffect(() => {
    if (!menuOpen && !panel) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuOpen && !menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setPanel(null);
        avatarButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, panel]);

  useEffect(() => {
    if (panel !== 'financial') return;
    let isCurrentRequest = true;
    setLoans(null);
    setLoanError('');
    api.getLoans()
      .then((response) => {
        if (isCurrentRequest) setLoans(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error: unknown) => {
        if (isCurrentRequest) setLoanError(getErrorMessage(error, 'Unable to load loan details. Showing the latest profile totals.'));
      });
    return () => { isCurrentRequest = false; };
  }, [panel]);

  if (!user) return null;

  const openPanel = (nextPanel: ProfilePanel) => {
    setMenuOpen(false);
    setFeedback(null);
    if (nextPanel === 'settings') {
      setDraft({ fullName: user.fullName || '', email: user.email || '', phone: user.phone || '' });
    }
    if (nextPanel === 'password') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPanel(nextPanel);
  };

  const closePanel = () => {
    setPanel(null);
    setFeedback(null);
    avatarButtonRef.current?.focus();
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.updateProfile(draft);
      updateUser(response.data);
      setFeedback({ kind: 'success', text: 'Profile details saved.' });
    } catch (error: unknown) {
      setFeedback({ kind: 'error', text: getErrorMessage(error, 'Unable to save profile details.') });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.changePassword({ currentPassword, newPassword, confirmPassword });
      setFeedback({ kind: 'success', text: response.data.message || 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      setFeedback({ kind: 'error', text: getErrorMessage(error, 'Unable to change password.') });
    } finally {
      setSaving(false);
    }
  };

  const availableLoans = loans?.length ? loans : null;
  const outstanding = availableLoans
    ? availableLoans.reduce((total, loan) => total + Number(loan.outstanding || 0), 0)
    : user.existing_debt;
  const activeLoanCount = availableLoans?.length ?? user.active_loan_count;
  const totalEmi = availableLoans
    ? availableLoans.reduce((total, loan) => total + Number(loan.emi || 0), 0)
    : user.monthly_emi;
  const noFinancialData = !loans?.length
    && !user.active_loan_count
    && !user.existing_debt
    && !user.monthly_emi
    && !user.monthly_income
    && !user.cashflow_score;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          ref={avatarButtonRef}
          type="button"
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br from-emerald-400/25 to-cyan-500/25 text-sm font-bold text-cyan-100 shadow-sm transition hover:border-cyan-300 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          {initialsFor(displayName)}
        </button>
        <div
          role="menu"
          aria-label="Profile options"
          aria-hidden={!menuOpen}
          className={`absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40 transition duration-150 ease-out ${menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none -translate-y-2 opacity-0'}`}
        >
          <div className="border-b border-slate-800 px-3 py-2">
            <div className="truncate text-sm font-semibold text-slate-100">{displayName}</div>
            <div className="truncate text-xs text-slate-400">{userId}</div>
          </div>
          {menuItems.map((item) => (
            <button
              key={item.panel}
              type="button"
              role="menuitem"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => openPanel(item.panel)}
              className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-cyan-200 focus:bg-slate-800 focus:outline-none"
            >
              <span aria-hidden="true" className="w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="mt-1 border-t border-slate-800 pt-1">
            <button
              type="button"
              role="menuitem"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => { setMenuOpen(false); onLogout(); }}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/10 focus:bg-rose-500/10 focus:outline-none"
            >
              <span aria-hidden="true" className="w-5 text-center">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {panel && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="profile-dialog max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur sm:px-6">
              <h2 id="profile-dialog-title" className="text-lg font-bold text-slate-100">
                {panel === 'profile' && 'Profile'}
                {panel === 'settings' && 'Account Settings'}
                {panel === 'password' && 'Change Password'}
                {panel === 'financial' && 'Financial Profile'}
              </h2>
              <button type="button" onClick={closePanel} aria-label="Close dialog" className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white">×</button>
            </div>

            {panel === 'profile' && (
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br from-emerald-400/25 to-cyan-500/25 text-xl font-bold text-cyan-100">{initialsFor(displayName)}</div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-slate-100">{displayName}</div>
                    <div className="text-sm text-slate-400">{user.worker_type || 'User'}</div>
                  </div>
                </div>
                <dl className="grid gap-x-6 sm:grid-cols-2">
                  <ProfileField label="User ID" value={userId} />
                  <ProfileField label="Name" value={user.fullName || 'Not provided'} />
                  <ProfileField label="User type / role" value={user.worker_type || 'Not provided'} />
                  <ProfileField label="Email" value={user.email || 'Not provided'} />
                  <ProfileField label="Phone number" value={user.phone || 'Not provided'} />
                  <ProfileField label="Monthly income" value={formatMoney(user.monthly_income)} />
                  <ProfileField label="Account created" value={formatCreatedAt(user.createdAt)} />
                </dl>
              </div>
            )}

            {panel === 'settings' && (
              <form onSubmit={saveProfile} className="space-y-4 p-5 sm:p-6">
                <p className="text-sm text-slate-400">Update the contact details saved to your account.</p>
                <FormField label="Full name" autoComplete="name" value={draft.fullName} maxLength={100} onChange={(value) => setDraft({ ...draft, fullName: value })} required />
                <FormField label="Email" type="email" autoComplete="email" value={draft.email} maxLength={254} onChange={(value) => setDraft({ ...draft, email: value })} required />
                <FormField label="Phone number" type="tel" autoComplete="tel" value={draft.phone} maxLength={24} onChange={(value) => setDraft({ ...draft, phone: value })} />
                <Feedback feedback={feedback} />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closePanel} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">Cancel</button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </form>
            )}

            {panel === 'password' && (
              <form onSubmit={savePassword} className="space-y-4 p-5 sm:p-6">
                <p className="text-sm text-slate-400">Use at least 12 characters. Your current password is required to confirm this change.</p>
                <FormField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} required />
                <FormField label="New password" type="password" autoComplete="new-password" value={newPassword} minLength={12} onChange={setNewPassword} required />
                <FormField label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} minLength={12} onChange={setConfirmPassword} required />
                <Feedback feedback={feedback} />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closePanel} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">Cancel</button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{saving ? 'Updating...' : 'Update password'}</button>
                </div>
              </form>
            )}

            {panel === 'financial' && (
              <div className="space-y-4 p-5 sm:p-6">
                {loanError && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{loanError}</p>}
                {loans === null && !loanError && <p role="status" className="text-sm text-slate-400">Loading your loan details...</p>}
                {loans !== null && noFinancialData && <p className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-3 text-sm text-slate-400">No financial or loan details are available for this account yet.</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FinancialMetric label="Monthly income" value={formatMoney(user.monthly_income)} />
                  <FinancialMetric label="Outstanding loans" value={formatMoney(outstanding)} />
                  <FinancialMetric label="Active loans" value={String(activeLoanCount)} />
                  <FinancialMetric label="Total monthly EMI" value={formatMoney(totalEmi)} />
                  {Number.isFinite(user.cashflow_score) && <FinancialMetric label="CrediMerge health score" value={`${user.cashflow_score}/100`} detail="Cash-flow estimate, not a bureau score" />}
                </div>
              </div>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-800 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function FinancialMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-100">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

function FormField({
  label,
  type = 'text',
  autoComplete,
  value,
  maxLength,
  minLength,
  onChange,
  required = false,
}: {
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-300">
      <span>{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        maxLength={maxLength}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
      />
    </label>
  );
}

function Feedback({ feedback }: { feedback: { kind: 'success' | 'error'; text: string } | null }) {
  if (!feedback) return null;
  const styles = feedback.kind === 'success'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  return <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{feedback.text}</p>;
}
