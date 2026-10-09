import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { User } from '../types';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';
import TermsPrivacyModal from '../components/TermsPrivacyModal';
import GoogleAccountModal from '../components/GoogleAccountModal';
import {
  signInWithGooglePopup,
  loginWithFirebase,
  signupWithFirebase,
} from '../config/firebase';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

const demoUsers: Record<string, { password: string; user: User }> = {
  GIG1001: {
    password: 'GIG1001@123',
    user: {
      user_id: 'GIG1001',
      userId: 'GIG1001',
      fullName: 'Vikram Singh (Demo)',
      age: 47,
      worker_type: 'Driver',
      monthly_income: 47600,
      income_stability_score: 0.697,
      monthly_expenses: 28500,
      monthly_savings: 13400,
      existing_debt: 31400,
      monthly_emi: 2500,
      credit_card_balance: 19300,
      bnpl_balance: 6700,
      vehicle_loan_outstanding: 0,
      active_loan_count: 0,
      repayment_rate: 0.791,
      missed_payments_12m: 0,
      foir_pct: 5.25,
      monthly_cashflow: 16600,
      cashflow_score: 62.2,
      risk_band: 'Low Risk',
      forecast_30d_cashflow: 14940,
      forecast_60d_cashflow: 15459.98,
      forecast_90d_cashflow: 14904.94,
    },
  },
  GIG1002: {
    password: 'GIG1002@123',
    user: {
      user_id: 'GIG1002',
      userId: 'GIG1002',
      fullName: 'Anita Roy (Demo)',
      age: 33,
      worker_type: 'Micro-Merchant',
      monthly_income: 40600,
      income_stability_score: 0.41,
      monthly_expenses: 26400,
      monthly_savings: 16000,
      existing_debt: 100300,
      monthly_emi: 3100,
      credit_card_balance: 13400,
      bnpl_balance: 4600,
      vehicle_loan_outstanding: 0,
      active_loan_count: 1,
      repayment_rate: 1,
      missed_payments_12m: 1,
      foir_pct: 7.64,
      monthly_cashflow: 11100,
      cashflow_score: 50.7,
      risk_band: 'Moderate Risk',
      forecast_30d_cashflow: 9990,
      forecast_60d_cashflow: 10329.62,
      forecast_90d_cashflow: 10804.17,
    },
  },
};

const REMEMBERED_KEY = 'credimerge_remembered_identifier';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'login' | 'register' | 'forgot' | 'verify'
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerWorkerType, setRegisterWorkerType] = useState('Delivery Partner');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSentMessage, setForgotSentMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  // Email verification form state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpCode, setDevOtpCode] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Modals state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<'terms' | 'privacy'>('terms');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-fill remembered identifier on mount
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_KEY);
    if (remembered) {
      setIdentifier(remembered);
      setRememberMe(true);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Clean error when switching modes
  const switchMode = (newMode: AuthMode) => {
    setError('');
    setSuccessMessage('');
    setForgotSentMessage('');
    setMode(newMode);
  };

  // 1. Google Sign-In Handler
  const handleGoogleAccountSelect = async (account: { email: string; name: string; picture?: string; avatar?: string }) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.googleAuth({
        email: account.email,
        name: account.name,
        picture: account.avatar || account.picture,
      });

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_KEY, account.email);
      }

      setShowGoogleModal(false);
      login(res.data.user, res.data.token, rememberMe);
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGooglePopup();
      if (result?.user?.email) {
        await handleGoogleAccountSelect({
          email: result.user.email,
          name: result.user.displayName || result.user.email.split('@')[0],
          picture: result.user.photoURL || undefined,
        });
        return;
      }
      setShowGoogleModal(true);
    } catch (err: any) {
      console.warn('Firebase Google Auth popup error, falling back to account chooser:', err);
      setShowGoogleModal(true);
    } finally {
      setLoading(false);
    }
  };

  // 2. Email + Password Sign-In Handler
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const cleanIdentifier = identifier.trim();

    // Remember Me handling
    if (rememberMe) {
      localStorage.setItem(REMEMBERED_KEY, cleanIdentifier);
    } else {
      localStorage.removeItem(REMEMBERED_KEY);
    }

    // Check demo users first
    const upperId = cleanIdentifier.toUpperCase();
    const demo = demoUsers[upperId];
    if (demo && demo.password === loginPassword) {
      login(demo.user, `demo-${demo.user.user_id.toLowerCase()}`, rememberMe);
      navigate('/home');
      setLoading(false);
      return;
    }

    try {
      const res = await api.login(cleanIdentifier, loginPassword);
      if (res.data.requiresVerification) {
        setVerificationEmail(res.data.email || cleanIdentifier);
        switchMode('verify');
        setSuccessMessage('Please enter the 6-digit verification code sent to your email.');
        return;
      }
      login(res.data.user, res.data.token, rememberMe);
      navigate('/home');
    } catch (err: any) {
      // If backend login fails and input is an email, attempt Firebase Authentication
      if (cleanIdentifier.includes('@')) {
        try {
          const fbRes = await loginWithFirebase(cleanIdentifier, loginPassword);
          if (fbRes?.user?.email) {
            const authRes = await api.googleAuth({
              email: fbRes.user.email,
              name: fbRes.user.displayName || fbRes.user.email.split('@')[0],
              picture: fbRes.user.photoURL || undefined,
            });
            login(authRes.data.user, authRes.data.token, rememberMe);
            navigate('/home');
            return;
          }
        } catch (fbErr: any) {
          console.warn('Firebase login attempt fallback error:', fbErr?.message);
        }
      }

      const message = err.response?.data?.error;
      setError(message || (err.response
        ? 'Login failed. Check your email/User ID and password.'
        : 'Login service unavailable. Set VITE_API_URL to the backend URL.'));
    } finally {
      setLoading(false);
    }
  };

  // 3. Registration Handler
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    const strength = evaluatePassword(registerPassword);
    if (strength.score < 2) {
      setError('Please choose a stronger password that meets security criteria.');
      return;
    }

    setLoading(true);
    try {
      // Sync with Firebase Auth
      try {
        await signupWithFirebase(registerEmail.trim(), registerPassword);
      } catch (fbErr: any) {
        console.warn('Firebase user creation note:', fbErr?.message);
      }

      const res = await api.register({
        fullName: registerName.trim(),
        email: registerEmail.trim(),
        workerType: registerWorkerType,
        password: registerPassword,
        confirmPassword: registerConfirmPassword,
        confirmation: registerConfirmPassword,
      });

      setVerificationEmail(registerEmail.trim());
      if (res.data.devCode) {
        setDevOtpCode(res.data.devCode);
      }
      setResendCooldown(60);
      switchMode('verify');
      setSuccessMessage('Account created! A 6-digit verification code was sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. OTP Verification Handlers
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setOtpDigits(nextDigits);
    const nextFocusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyEmail(verificationEmail, code);
      login(res.data.user, res.data.token, rememberMe);
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.resendVerification(verificationEmail);
      setResendCooldown(60);
      if (res.data.devCode) {
        setDevOtpCode(res.data.devCode);
      }
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to resend code right now.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password Handler
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotSentMessage('');
    setDevResetUrl('');

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestPasswordReset(forgotEmail.trim());
      setForgotSentMessage(res.data.message || 'If an account exists, a password reset link has been dispatched.');
      if (res.data.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-scene relative isolate min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/80 text-slate-300 shadow-lg backdrop-blur-md hover:border-emerald-400 hover:text-emerald-400 transition"
        >
          {theme === 'dark' ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Background SVG graphics */}
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
          <g opacity=".18" transform="translate(105 150) rotate(-12)">
            <rect width="176" height="112" rx="12" />
            <path d="M1 31h174M18 81h45m-45 13h75" />
            <circle cx="148" cy="84" r="10" />
          </g>
          <g opacity=".16" transform="translate(1150 635) rotate(12)">
            <rect width="178" height="112" rx="12" />
            <path d="M1 31h176M18 81h45m-45 13h75" />
            <circle cx="150" cy="84" r="10" />
          </g>
          <g opacity=".18" transform="translate(1130 186)">
            <circle cx="72" cy="72" r="57" strokeDasharray="5 8" />
            <circle cx="72" cy="72" r="42" />
            <path d="M72 72 99 48M72 72V34" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 91a28 28 0 0 0 39-2" />
          </g>
          <g opacity=".15" transform="translate(90 620)">
            <path d="M0 142h198M12 142V87h26v55m13 0V52h26v90m13 0V76h26v66m13 0V20h26v122m13 0V60h26v82" />
            <path className="auth-chart-line" d="m8 72 48-27 46 19 44-48 44 22" strokeWidth="2" />
          </g>
          <g opacity=".17" transform="translate(1190 410)">
            <path d="M20 28 70 0l50 28v5H20zm9 8v48m27-48v48m28-48v48m27-48v48M17 88h106v9H17z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 116h144m-120 0v17m96-17v17M9 140h126" />
          </g>
        </g>
      </svg>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md sm:max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Smart Debt Management &amp; Credit Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            💸 CrediMerge
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base font-normal">
            Financial analytics, credit health &amp; consolidation
          </p>
        </div>

        {/* Auth Card */}
        <div className="auth-card bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300">
          {/* Tabs for Login / Register */}
          {mode !== 'forgot' && mode !== 'verify' && (
            <div className="auth-toggle-pill flex p-1 mb-6 rounded-xl bg-slate-950/60 border border-slate-800">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'auth-toggle-active bg-emerald-500 text-white shadow-md'
                    : 'auth-tab-inactive text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'auth-toggle-active bg-emerald-500 text-white shadow-md'
                    : 'auth-tab-inactive text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Social Google Button */}
          {mode !== 'forgot' && mode !== 'verify' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="auth-social-btn w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-600 text-slate-100 font-semibold text-sm transition-all shadow-sm group disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/60" />
                </div>
                <div className="relative inline-block px-3 bg-slate-900 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  or with email
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1 font-medium leading-snug">{error}</div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <span className="text-base shrink-0">✓</span>
              <div className="flex-1 font-medium leading-snug">{successMessage}</div>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-emerald-400 hover:text-emerald-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* =========================================
              VIEW 1: SIGN IN FORM
          ========================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or User ID
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or GIG1001"
                  required
                  disabled={loading}
                  className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="auth-label text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={loading}
                    className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-12 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                  >
                    {showLoginPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>🚀 Sign In to Dashboard</span>
                )}
              </button>

              {/* Demo Quick-Fill Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  ⚡ Quick Demo Accounts:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('GIG1001');
                      setLoginPassword('GIG1001@123');
                    }}
                    className="auth-secondary-btn py-1.5 px-2.5 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition"
                  >
                    <div className="font-semibold text-emerald-400">GIG1001</div>
                    <div className="text-[10px] text-slate-400">Driver · Low Risk</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('GIG1002');
                      setLoginPassword('GIG1002@123');
                    }}
                    className="auth-secondary-btn py-1.5 px-2.5 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition"
                  >
                    <div className="font-semibold text-cyan-400">GIG1002</div>
                    <div className="text-[10px] text-slate-400">Micro-Merchant · Moderate</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* =========================================
              VIEW 2: CREATE ACCOUNT FORM
          ========================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  disabled={loading}
                  className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  required
                  disabled={loading}
                  className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Worker / Profession Type
                </label>
                <select
                  value={registerWorkerType}
                  onChange={(e) => setRegisterWorkerType(e.target.value)}
                  disabled={loading}
                  className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 focus:outline-none focus:border-emerald-400 transition"
                >
                  <option value="Delivery Partner">Delivery Partner (Zomato, Swiggy, Zepto)</option>
                  <option value="Driver">Driver (Uber, Ola, Rapido)</option>
                  <option value="Micro-Merchant">Micro-Merchant / Retail Vendor</option>
                  <option value="Gig Worker">Freelancer / Gig Professional</option>
                </select>
              </div>

              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    disabled={loading}
                    className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-12 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                  >
                    {showRegisterPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Real-time Password Strength Meter */}
                <PasswordStrengthMeter password={registerPassword} />
              </div>

              <div>
                <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    disabled={loading}
                    className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-12 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword((v) => !v)}
                    aria-label={showRegisterConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                  >
                    {showRegisterConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-500 shrink-0"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTermsModalTab('terms');
                        setShowTermsModal(true);
                      }}
                      className="text-emerald-400 underline hover:text-emerald-300 font-medium"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTermsModalTab('privacy');
                        setShowTermsModal(true);
                      }}
                      className="text-emerald-400 underline hover:text-emerald-300 font-medium"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              </div>

              {/* Create Account Submit */}
              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account &amp; Verify Email</span>
                )}
              </button>
            </form>
          )}

          {/* =========================================
              VIEW 3: EMAIL VERIFICATION (OTP)
          ========================================= */}
          {mode === 'verify' && (
            <div className="space-y-5">
              <div className="text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl border border-emerald-500/20 mb-3">
                  ✉️
                </span>
                <h2 className="text-xl font-bold text-slate-100">
                  Verify Your Email
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  We've sent a 6-digit confirmation code to:
                  <br />
                  <span className="font-semibold text-emerald-300">
                    {verificationEmail || 'your email'}
                  </span>
                </p>
              </div>

              {/* Dev Helper badge */}
              {devOtpCode && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span>Testing OTP Code: <strong>{devOtpCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      const codeDigits = devOtpCode.split('').slice(0, 6);
                      setOtpDigits(codeDigits);
                    }}
                    className="font-bold underline text-amber-200 hover:text-white"
                  >
                    Click to auto-fill
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                {/* 6-box OTP input */}
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      disabled={loading}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border border-slate-700 bg-slate-950/80 text-emerald-400 focus:outline-none focus:border-emerald-400 transition"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Proceed to Dashboard</span>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="hover:text-slate-200 transition"
                >
                  ← Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW 4: FORGOT PASSWORD
          ========================================= */}
          {mode === 'forgot' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-3 transition"
                >
                  ← Back to Sign In
                </button>
                <h2 className="text-xl font-bold text-slate-100">
                  Reset your password
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Enter your account email address. We'll send a secure reset link with instructions.
                </p>
              </div>

              {forgotSentMessage ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-3">
                  <p>{forgotSentMessage}</p>
                  {devResetUrl && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/20 text-xs text-white">
                      <strong>⚡ Testing Reset Link:</strong>
                      <br />
                      <a
                        href={devResetUrl}
                        className="underline break-all text-cyan-200 hover:text-white"
                      >
                        {devResetUrl}
                      </a>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full mt-2 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-semibold hover:border-emerald-400 transition"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="auth-label block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      className="auth-input w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Sending reset link...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="auth-meta text-center text-slate-500 text-xs mt-6">
          © 2026 CrediMerge · Smart Credit &amp; Debt Architecture
        </p>
      </div>

      {/* Terms & Privacy Modal */}
      <TermsPrivacyModal
        isOpen={showTermsModal}
        initialTab={termsModalTab}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreedToTerms(true)}
      />

      {/* Google Account Selector Modal */}
      <GoogleAccountModal
        isOpen={showGoogleModal}
        isLoading={loading}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelect}
      />
    </div>
  );
}