import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { demoUsers } from '../config/demoUsers';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Modals state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<'terms' | 'privacy'>('terms');

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1-Click Demo launching state
  const [demoLaunching, setDemoLaunching] = useState<string | null>(null);

  // Calculator State
  const [calcDebt, setCalcDebt] = useState<number>(250000);
  const [calcCurrentRate, setCalcCurrentRate] = useState<number>(28);
  const [calcTenureMonths, setCalcTenureMonths] = useState<number>(24);
  const consolidationRate = 12.5; // Average prime consolidation APR

  // Persona State
  const [selectedPersona, setSelectedPersona] = useState<'driver' | 'delivery' | 'merchant' | 'freelancer'>('driver');

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // EMI Math Calculation
  const calculation = useMemo(() => {
    const P = calcDebt;
    const n = calcTenureMonths;

    const rCurr = calcCurrentRate / 12 / 100;
    const currentEmi =
      rCurr > 0
        ? Math.round((P * rCurr * Math.pow(1 + rCurr, n)) / (Math.pow(1 + rCurr, n) - 1))
        : Math.round(P / n);
    const totalCurrentPayment = currentEmi * n;
    const totalCurrentInterest = totalCurrentPayment - P;

    const rCons = consolidationRate / 12 / 100;
    const consolidatedEmi =
      rCons > 0
        ? Math.round((P * rCons * Math.pow(1 + rCons, n)) / (Math.pow(1 + rCons, n) - 1))
        : Math.round(P / n);
    const totalConsolidatedPayment = consolidatedEmi * n;
    const totalConsolidatedInterest = totalConsolidatedPayment - P;

    const monthlySavings = Math.max(0, currentEmi - consolidatedEmi);
    const totalInterestSaved = Math.max(0, totalCurrentInterest - totalConsolidatedInterest);
    const reductionPct = currentEmi > 0 ? Math.round((monthlySavings / currentEmi) * 100) : 0;

    return {
      currentEmi,
      consolidatedEmi,
      monthlySavings,
      totalInterestSaved,
      reductionPct,
    };
  }, [calcDebt, calcCurrentRate, calcTenureMonths]);

  // Quick Demo Login Action
  const handleLaunchDemo = (userId: 'GIG1001' | 'GIG1002') => {
    setDemoLaunching(userId);
    const target = demoUsers[userId];
    if (target) {
      setTimeout(() => {
        login(target.user, `demo-${userId.toLowerCase()}`, true);
        navigate('/home');
      }, 350);
    }
  };

  const personas = {
    driver: {
      name: 'Cab & Fleet Drivers',
      role: 'Uber, Ola, Rapido & Commercial Fleet',
      painPoint: 'Multiple vehicle loans, smartphone EMIs, and surge volatility draining weekly income.',
      solution: 'Consolidate multiple high-cost NBFC vehicle add-ons into one predictable EMI, smoothing fuel cash outflows.',
      stats: 'Avg ₹6,400/mo freed for emergency fuel & maintenance reserves',
      badge: 'Vehicle & Asset Protection',
      avatar: '🚖',
    },
    delivery: {
      name: 'Instant Delivery Partners',
      role: 'Zomato, Swiggy, Zepto, Blinkit',
      painPoint: 'Predatory 36%+ BNPL balances (Slice, Simpl, LazyPay) eating daily shift incentives.',
      solution: 'Automated statement sync to wipe out micro-loans and protect daily net earnings from compound interest.',
      stats: 'Avg 41% drop in monthly payment burden',
      badge: 'BNPL Trap Relief',
      avatar: '🛵',
    },
    merchant: {
      name: 'Kirana & Micro-Vendors',
      role: 'Retailers, Wholesalers & Local Stall Owners',
      painPoint: 'Informal supplier credits and rolled-over credit cards choking working inventory capital.',
      solution: 'GSTIN & PAN-verified cash flow scoring unlocks institutional consolidation lines without collateral.',
      stats: 'Avg ₹14,200/mo cash flow liquidity boosted',
      badge: 'Working Capital Boost',
      avatar: '🏪',
    },
    freelancer: {
      name: 'Freelancers & Tech Creators',
      role: 'Designers, Developers, Gig Consultants',
      painPoint: '30-to-60 day client invoice delays triggering high credit card revolving interest.',
      solution: 'Predictive 30/60/90-day cash flow buffer analysis preventing late-fee cascade and credit score erosion.',
      stats: 'Zero missed payment penalties through proactive cash modeling',
      badge: 'Invoice Buffer Protection',
      avatar: '💻',
    },
  };

  const faqs = [
    {
      q: 'Is CrediMerge a direct money lender or bank?',
      a: 'No. CrediMerge is an independent financial intelligence and decision-support architecture. We provide deep cash-flow analytics, multi-loan amortization simulations, and alternative underwriting metrics to empower you to consolidate high-interest debt with verified institutional partners safely.',
    },
    {
      q: 'How does CrediMerge calculate my credit health if I have no CIBIL score?',
      a: 'Traditional credit bureaus penalize gig and informal workers who have irregular earnings. CrediMerge utilizes an Alternative Cash-Flow Health Model: we evaluate your income stability velocity, bank surplus ratio, FOIR (Fixed Obligation to Income Ratio), and repayment discipline using bank statements and verified Sandbox APIs.',
    },
    {
      q: 'Can I test out all features without providing personal banking credentials?',
      a: 'Absolutely! Click the "Instant Demo" button at any time. We provide pre-configured, live sandbox profiles (Vikram Singh - Driver, and Anita Roy - Merchant) with simulated loans, cash-flow metrics, and transaction streams so you can explore the entire platform instantly.',
    },
    {
      q: 'How does the Gemini AI Financial Copilot assist me?',
      a: 'The embedded Google Gemini financial engine analyzes your active loans, interest rate disparities, and monthly cash flow. It explains trade-offs in clear, natural language—such as whether the Debt Avalanche or Snowball strategy saves you more money—without exposing any private keys.',
    },
    {
      q: 'Is my data secure and compliant with Indian financial regulations?',
      a: 'Yes. CrediMerge utilizes 256-bit AES encryption and Trusted Execution Environment (TEE) concepts. Government and banking checks are orchestrated through Sandbox.co.in test APIs, and time-series audit events are logged in immutable TimescaleDB hypertables. We never resell your financial data.',
    },
    {
      q: 'How much money does a typical worker save through CrediMerge consolidation?',
      a: 'Our models show users with scattered high-interest liabilities (BNPL at 30-36%, credit card roll-overs at 42%, and micro-loans) reduce their weighted average interest rate down to 12-14%, saving an average of 38.4% on monthly EMI outflows and over ₹45,000 in compound interest.',
    },
  ];

  return (
    <div className="relative min-h-screen text-slate-100 selection:bg-emerald-500/30 selection:text-white">
      {/* ========================================================
          STICKY TOP NAVBAR
      ======================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050707]/85 backdrop-blur-2xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex items-center gap-3 text-left focus:outline-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 text-lg font-black transition-all duration-300 group-hover:scale-105 group-hover:bg-emerald-400 group-hover:text-black shadow-lg shadow-emerald-500/10">
                ₹
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-white">
                    Credi<span className="text-emerald-400">Merge</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    AI 2.0
                  </span>
                </div>
                <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase hidden sm:block">
                  Smart Debt &amp; Credit Platform
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#overview" className="hover:text-emerald-400 transition-colors">
              Overview
            </a>
            <a href="#calculator" className="hover:text-emerald-400 transition-colors">
              Debt Calculator
            </a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Intelligence
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <a href="#personas" className="hover:text-emerald-400 transition-colors">
              Personas
            </a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="theme-toggle inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-400 transition"
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

            {user ? (
              <button
                onClick={() => navigate('/home')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
              >
                <span>Dashboard</span>
                <span className="text-sm">→</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl border border-white/10 hover:border-emerald-400/40 text-slate-200 text-xs font-semibold tracking-wider hover:text-white transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleLaunchDemo('GIG1001')}
                  disabled={demoLaunching !== null}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-emerald-400/20 flex items-center gap-1.5"
                >
                  {demoLaunching ? (
                    <span>Launching...</span>
                  ) : (
                    <>
                      <span>⚡ Instant Demo</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#070b0a] px-6 py-5 space-y-4 text-sm font-semibold">
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              Overview
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              Debt Calculator
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              Intelligence Engine
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              How It Works
            </a>
            <a
              href="#personas"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              Gig Worker Profiles
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-emerald-400"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl border border-white/15 text-center text-slate-200"
              >
                Sign In / Register
              </button>
              <button
                onClick={() => handleLaunchDemo('GIG1001')}
                className="w-full py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-center"
              >
                ⚡ Launch Live Demo
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          HERO SECTION: THE FINTECH COMMAND CENTER
      ======================================================== */}
      <section id="overview" className="relative pt-12 pb-24 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Next-Gen Debt Management &amp; Alternative Credit for India's Gig Economy</span>
              <span className="text-emerald-400">→</span>
            </div>
          </div>

          {/* Main Hero Header */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
              Crush scattered high-interest loans.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Consolidate into one predictable EMI.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              CrediMerge unifies BNPL, credit cards, and micro-loans into a single, low-interest repayment.
              Powered by real-time bank statement cash-flow analysis, Gemini AI guidance, and Sandbox verification.
            </p>

            {/* Hero CTAs */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#calculator"
                className="px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Calculate Your Monthly Savings</span>
                <span className="text-base">↓</span>
              </a>

              <button
                onClick={() => handleLaunchDemo('GIG1001')}
                disabled={demoLaunching !== null}
                className="px-7 py-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-sm tracking-wider uppercase transition backdrop-blur-md flex items-center gap-2"
              >
                <span>⚡ Test-Drive Live Demo</span>
              </button>

              <button
                onClick={() => navigate('/login')}
                className="px-6 py-4 rounded-2xl border border-white/10 hover:border-white/30 text-slate-300 hover:text-white font-semibold text-sm tracking-wide transition"
              >
                Sign In / Register
              </button>
            </div>

            {/* Quick Demo Selector Chips */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider mr-1">
                Zero-Sign-In Demo Personas:
              </span>
              <button
                type="button"
                onClick={() => handleLaunchDemo('GIG1001')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:border-emerald-400 text-slate-300 hover:text-emerald-300 transition"
              >
                <span>🚗 Vikram Singh (Driver · 47yr)</span>
                <span className="text-emerald-400 font-mono text-[10px]">Launch →</span>
              </button>
              <button
                type="button"
                onClick={() => handleLaunchDemo('GIG1002')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition"
              >
                <span>🛒 Anita Roy (Merchant · 33yr)</span>
                <span className="text-cyan-400 font-mono text-[10px]">Launch →</span>
              </button>
            </div>
          </div>

          {/* ========================================================
              HERO INTERACTIVE COCKPIT / DASHBOARD PREVIEW CARD
          ======================================================== */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="cm-glass-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden cm-scan">
              {/* Cockpit Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-400">
                    DEBTLENS™ LIVE SIMULATION PREVIEW
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
                    STATUS: OPTIMIZED
                  </span>
                  <span className="text-emerald-400">● 99.9% TEE AUDITED</span>
                </div>
              </div>

              {/* Cockpit Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* Metric 1 */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Total Active Debt
                  </div>
                  <div className="text-3xl font-black text-white font-mono">
                    ₹1,84,000
                  </div>
                  <div className="text-xs text-rose-400 flex items-center gap-1 pt-1">
                    <span>⚠️ Scattered across 4 lenders</span>
                    <span className="text-[10px] text-slate-500">(Avg 29.4% APR)</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Consolidated Monthly EMI
                  </div>
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    ₹8,840<span className="text-sm text-slate-400 font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-emerald-300 font-semibold pt-1">
                    📉 Down from ₹14,920/mo (-41% EMI drop)
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Net Monthly Cash Surplus
                  </div>
                  <div className="text-3xl font-black text-cyan-400 font-mono">
                    +₹6,080<span className="text-sm text-slate-400 font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold pt-1">
                    🛡️ Safe EMI Capacity &amp; Emergency Buffer
                  </div>
                </div>
              </div>

              {/* Embedded AI Advisor Callout in Cockpit */}
              <div className="mt-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] flex items-start sm:items-center gap-3">
                <span className="text-2xl shrink-0">✨</span>
                <div className="text-xs sm:text-sm text-slate-200">
                  <strong className="text-emerald-300 font-semibold">Gemini AI Synthesis:</strong>{' '}
                  "Consolidating Anita's high-cost BNPL balances (36% APR) into a single 12.5% facility saves ₹52,400 in compound interest over 24 months, cutting FOIR from 44% down to 23%."
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Bar */}
          <div className="mt-14 pt-10 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono">₹4.2 Cr+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Debt Modeled &amp; Analyzed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">38.4%</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Average EMI Reduction</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">12,400+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Gig Workers Supported</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono">100%</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Zero-Secret Browser Safety</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          INTERACTIVE LIVE DEBT CONSOLIDATION CALCULATOR
      ======================================================== */}
      <section id="calculator" className="py-20 border-t border-white/[0.08] relative bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-3">
              Interactive ROI Simulator
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Calculate Your Real Debt Relief
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              Adjust your total liabilities and loan duration to see exactly how much cash you unlock each month.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Sliders & Controls */}
            <div className="lg:col-span-7 cm-glass-card rounded-3xl p-6 sm:p-8 space-y-7 border border-white/10">
              {/* Slider 1: Total Debt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Total Existing Debt Amount
                  </label>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{calcDebt.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="1000000"
                  step="5000"
                  value={calcDebt}
                  onChange={(e) => setCalcDebt(Number(e.target.value))}
                  className="w-full cm-range-slider cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
                  <span>₹25,000 (Micro)</span>
                  <span>₹5,00,000</span>
                  <span>₹10,00,000 (Max)</span>
                </div>
              </div>

              {/* Slider 2: Current Interest Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Current Average Interest Rate
                  </label>
                  <span className="text-2xl font-black text-rose-400 font-mono">
                    {calcCurrentRate}% <span className="text-xs text-slate-400">APR</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="42"
                  step="1"
                  value={calcCurrentRate}
                  onChange={(e) => setCalcCurrentRate(Number(e.target.value))}
                  className="w-full cm-range-slider cursor-pointer"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[11px] text-slate-500 self-center">Typical rates:</span>
                  {[
                    { label: 'Personal Loan (18%)', val: 18 },
                    { label: 'Vehicle Loan (22%)', val: 22 },
                    { label: 'BNPL Apps (30%)', val: 30 },
                    { label: 'Credit Card Rollover (38%)', val: 38 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setCalcCurrentRate(preset.val)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                        calcCurrentRate === preset.val
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector 3: Consolidation Tenure */}
              <div>
                <label className="text-sm font-bold text-slate-200 uppercase tracking-wider block mb-3">
                  Consolidation Tenure (Months)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[12, 24, 36, 48].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setCalcTenureMonths(months)}
                      className={`py-3 rounded-xl border text-center transition ${
                        calcTenureMonths === months
                          ? 'border-emerald-400 bg-emerald-500/20 text-white font-extrabold shadow-md shadow-emerald-500/10'
                          : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-base font-mono">{months}</div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Months</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Guaranteed Consolidation APR Badge */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-300">Target Prime Consolidation Rate</div>
                  <div className="text-[11px] text-slate-400">Institutional partnered lending benchmark</div>
                </div>
                <div className="text-xl font-black font-mono text-emerald-400">12.5% p.a.</div>
              </div>
            </div>

            {/* Right Column: Dynamic Savings Card */}
            <div className="lg:col-span-5 cm-glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-black/60 shadow-xl cm-glow-emerald">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                    ESTIMATED SAVINGS IMPACT
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-black">
                    -{calculation.reductionPct}% EMI CUT
                  </span>
                </div>

                {/* Big Savings Highlight */}
                <div className="py-6 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    You Save Every Single Month
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono mt-1">
                    ₹{calculation.monthlySavings.toLocaleString('en-IN')}
                    <span className="text-lg text-slate-400 font-normal">/mo</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Unlocks additional monthly grocery, education, or emergency savings.
                  </p>
                </div>

                {/* Before vs After Comparison */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">Current Monthly Outflow:</span>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      ₹{calculation.currentEmi.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-300 font-semibold">CrediMerge Consolidated:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      ₹{calculation.consolidatedEmi.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">Total Lifetime Interest Saved:</span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">
                      ₹{calculation.totalInterestSaved.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => handleLaunchDemo('GIG1001')}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:opacity-95 text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition"
                >
                  🚀 Test In Full Simulator With Real Data →
                </button>
                <div className="text-center text-[10px] text-slate-500 font-mono">
                  *Estimates for educational planning. Does not constitute a binding credit contract.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          CORE INTELLIGENCE PILLARS (FEATURES GRID)
      ======================================================== */}
      <section id="features" className="py-24 border-t border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
              Institutional Capabilities
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              One Unified Financial Intelligence Layer
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              Designed from the ground up for gig workers and modern earners who don't fit into outdated legacy bureau models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                ⚖️
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                DebtLens™ Multi-Loan Consolidation
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Aggregate smartphone BNPLs, vehicle installments, and credit card balances. Run interactive trade-off simulations
                between monthly cash flow relief vs total cost of borrowing.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-emerald-400 font-mono">
                ✓ Full Amortization Schedules &amp; Principal Splitting
              </div>
            </div>

            {/* Feature 2 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                Alternative Cashflow Credit Score
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Replaces rigid CIBIL rejections with dynamic income stability scoring. Evaluates recurring platform gig payouts,
                net cash surplus ratio, and Safe EMI Capacity.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-cyan-400 font-mono">
                ✓ 0-100 Cashflow Health Band &amp; FOIR Analysis
              </div>
            </div>

            {/* Feature 3 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-teal-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-2xl text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                Google Gemini AI Financial Copilot
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Embedded AI debt analyst powered by Google Gemini API. Asks plain-English questions about repayment strategies,
                prepayment feasibility, and ElevenLabs voice narration.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-teal-400 font-mono">
                ✓ Zero Secret Leakage · Server-Side Prompt Orchestration
              </div>
            </div>

            {/* Feature 4 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-indigo-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                Sandbox.co.in Bank &amp; PAN Verification
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Real-time government and banking verification with PAN format checking, GSTIN business validation, and Bank
                Account Penny Drop checks via RBI-compliant APIs.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-indigo-400 font-mono">
                ✓ Strict Masking &amp; Zero Private Token Exposure
              </div>
            </div>

            {/* Feature 5 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-amber-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                📈
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                TimescaleDB / Tiger Data Streams
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Time-series hypertables track transaction velocity, cash flow spikes, and verification events. Delivers
                predictive 30, 60, and 90-day cash flow forecasts.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-amber-400 font-mono">
                ✓ Real-time Hypertable Audit Trails
              </div>
            </div>

            {/* Feature 6 */}
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 hover:border-purple-400/50 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl text-purple-400 mb-5 group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                TEE-Grade Privacy &amp; Encryption
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Your financial transactions and statements remain encrypted. Built around Trusted Execution Environment (TEE)
                architecture—we never sell your credit records to predatory lenders.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-purple-400 font-mono">
                ✓ Bank-grade AES-256 Transport &amp; Storage
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          HOW IT WORKS (3-STEP VISUAL TIMELINE)
      ======================================================== */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.08] relative bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-3">
              Simple 3-Step Process
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              From Debt Trap to Financial Freedom
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              No endless paperwork. No predatory commissions. Clear financial clarity in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="cm-glass-card rounded-3xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black font-mono text-emerald-400/25 mb-4">01</div>
              <h3 className="text-xl font-bold text-white">Connect Debts &amp; Statements</h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Add active loans (BNPL, vehicle, credit card, personal) or upload your bank statements. Or verify your
                account via Sandbox Penny Drop in one click.
              </p>
              <div className="mt-5 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span>✓ Takes under 90 seconds</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="cm-glass-card rounded-3xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black font-mono text-cyan-400/25 mb-4">02</div>
              <h3 className="text-xl font-bold text-white">AI Maps True Cash Flow</h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Our algorithm separates regular platform payouts from high-interest debt drains, calculating your actual
                Safe EMI Capacity and Alternative Health Score.
              </p>
              <div className="mt-5 text-xs text-cyan-400 font-mono flex items-center gap-1.5">
                <span>✓ Powered by Google Gemini AI</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="cm-glass-card rounded-3xl p-8 border border-white/10 relative">
              <div className="text-5xl font-black font-mono text-teal-400/25 mb-4">03</div>
              <h3 className="text-xl font-bold text-white">Simulate &amp; Execute Relief</h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Explore custom consolidation offers. Watch your monthly EMI drop by up to 40%, saving thousands in interest
                and building long-term emergency savings.
              </p>
              <div className="mt-5 text-xs text-teal-400 font-mono flex items-center gap-1.5">
                <span>✓ Instant Amortization Download</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          BUILT FOR INDIA'S GIG WORKFORCE (PERSONA TABS)
      ======================================================== */}
      <section id="personas" className="py-24 border-t border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
              Worker-First Architecture
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Tailored For Modern Work Realities
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              Gig workers don't get monthly fixed salaries on the 1st. CrediMerge is built around the cadence of modern gig payouts.
            </p>
          </div>

          {/* Persona Tab Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {(['driver', 'delivery', 'merchant', 'freelancer'] as const).map((key) => {
              const p = personas[key];
              const active = selectedPersona === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPersona(key)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${
                    active
                      ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="text-base">{p.avatar}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Persona Spotlight Card */}
          <div className="max-w-4xl mx-auto cm-glass-card rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl p-3 rounded-2xl bg-black/50 border border-white/10">
                  {personas[selectedPersona].avatar}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{personas[selectedPersona].name}</h3>
                  <div className="text-xs text-emerald-400 font-mono mt-0.5">
                    {personas[selectedPersona].role}
                  </div>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 self-start sm:self-auto">
                {personas[selectedPersona].badge}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  ⚠️ The Common Debt Bottleneck:
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {personas[selectedPersona].painPoint}
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ✨ The CrediMerge Solution:
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {personas[selectedPersona].solution}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                <span className="text-emerald-400 text-lg">📈</span>
                <span>{personas[selectedPersona].stats}</span>
              </div>
              <button
                onClick={() => handleLaunchDemo('GIG1001')}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition"
              >
                Simulate This Persona →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          COMPARISON TABLE: CREDIMERGE VS TRADITIONAL
      ======================================================== */}
      <section className="py-24 border-t border-white/[0.08] relative bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Why Traditional Finance Fails Gig Workers
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              See the stark difference between predatory loan apps, legacy banks, and CrediMerge.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 cm-glass-card shadow-2xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase font-mono tracking-wider text-slate-400 bg-black/40">
                <tr>
                  <th className="py-4 px-6">Evaluation Dimension</th>
                  <th className="py-4 px-6 text-rose-400">Predatory BNPL Apps</th>
                  <th className="py-4 px-6 text-slate-400">Traditional Banks</th>
                  <th className="py-4 px-6 text-emerald-400 font-bold bg-emerald-500/10">CrediMerge Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Underwriting Model</td>
                  <td className="py-4 px-6 text-rose-300">Contacts/SMS scraping</td>
                  <td className="py-4 px-6 text-slate-400">Strict CIBIL + ITR proofs</td>
                  <td className="py-4 px-6 text-emerald-300 font-bold bg-emerald-500/10">Cashflow &amp; Surplus Velocity</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Interest Rates (APR)</td>
                  <td className="py-4 px-6 text-rose-300">30% to 48% compound</td>
                  <td className="py-4 px-6 text-slate-400">14% - 18% (if approved)</td>
                  <td className="py-4 px-6 text-emerald-300 font-bold bg-emerald-500/10">11.5% - 14% Consolidated</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">AI Financial Copilot</td>
                  <td className="py-4 px-6 text-rose-300">None (harassment bots)</td>
                  <td className="py-4 px-6 text-slate-400">Branch appointments</td>
                  <td className="py-4 px-6 text-emerald-300 font-bold bg-emerald-500/10">24/7 Gemini + Voice Copilot</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Consolidation Simulator</td>
                  <td className="py-4 px-6 text-rose-300">None (encourages roll-over)</td>
                  <td className="py-4 px-6 text-slate-400">Complex manual branch audit</td>
                  <td className="py-4 px-6 text-emerald-300 font-bold bg-emerald-500/10">DebtLens™ Real-Time Engine</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Data Privacy &amp; Reselling</td>
                  <td className="py-4 px-6 text-rose-300">Sells data to recovery agents</td>
                  <td className="py-4 px-6 text-slate-400">Spams with credit card calls</td>
                  <td className="py-4 px-6 text-emerald-300 font-bold bg-emerald-500/10">TEE Encrypted · Zero Data Resale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECURITY & COMPLIANCE FORTRESS
      ======================================================== */}
      <section id="security" className="py-24 border-t border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
              Institutional Trust
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Bank-Grade Security Architecture
            </h2>
            <p className="text-slate-400 mt-3 text-base sm:text-lg">
              We handle sensitive financial records with absolute cryptographic rigor and strict RBI compliance standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 space-y-3">
              <div className="text-2xl">🔒</div>
              <h3 className="text-lg font-bold text-white">256-Bit TLS &amp; AES-GCM</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                All data transmission between your browser, our Node.js API, and backend databases is encrypted with modern
                TLS 1.3 cryptographic suites.
              </p>
            </div>

            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 space-y-3">
              <div className="text-2xl">🛡️</div>
              <h3 className="text-lg font-bold text-white">TEE &amp; Zero Secret Leakage</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Gemini AI keys, Sandbox.co.in credentials, and Supabase service tokens reside strictly on backend servers.
                Never exposed to client bundles.
              </p>
            </div>

            <div className="cm-glass-card rounded-3xl p-7 border border-white/10 space-y-3">
              <div className="text-2xl">🏛️</div>
              <h3 className="text-lg font-bold text-white">Sandbox &amp; TimescaleDB Audited</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Government PAN, GSTIN, and Penny Drop verifications are logged as immutable audit events in Tiger Data
                TimescaleDB hypertables for compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          FREQUENTLY ASKED QUESTIONS (ACCORDION)
      ======================================================== */}
      <section id="faq" className="py-24 border-t border-white/[0.08] relative bg-slate-950/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-3">
              Common Questions
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 mt-3 text-base">
              Everything you need to know about CrediMerge, our algorithms, and our demo sandbox.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="cm-glass-card rounded-2xl border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="text-base sm:text-lg font-bold text-white">
                      {faq.q}
                    </span>
                    <span
                      className={`text-xl text-emerald-400 transform transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-45' : 'rotate-0'
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================
          FINAL HIGH-CONVERTING BOTTOM CTA BANNER
      ======================================================== */}
      <section className="py-24 border-t border-white/[0.08] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="cm-glass-card rounded-3xl p-10 sm:p-14 border border-emerald-500/30 shadow-2xl relative overflow-hidden cm-scan">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Stop bleeding cash to high interest.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Take control of your financial future today.
              </span>
            </h2>
            <p className="mt-5 text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Join thousands of drivers, delivery partners, and merchants who have slashed their monthly debt payments.
              Zero sign-up friction with our 1-click test drive.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleLaunchDemo('GIG1001')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 hover:opacity-95 transition flex items-center gap-2"
              >
                <span>⚡ Test Drive Sandbox (No Sign Up)</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-2xl border border-white/20 hover:border-emerald-400 text-white font-bold text-sm tracking-wider uppercase transition"
              >
                Create Free Account →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER
      ======================================================== */}
      <footer className="border-t border-white/[0.08] bg-[#030505] py-14 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 font-bold">
                  ₹
                </span>
                <span className="text-lg font-black text-white tracking-tight">
                  Credi<span className="text-emerald-400">Merge</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Smart debt consolidation and alternative credit health engine for India's independent workforce.
              </p>
              <div className="text-[10px] font-mono text-emerald-400/80">
                ● ALL SYSTEMS OPERATIONAL
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Product Navigation</div>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button onClick={() => navigate('/home')} className="hover:text-emerald-400 transition">
                    Dashboard Overview
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/emi')} className="hover:text-emerald-400 transition">
                    EMI Management
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/credit-health')} className="hover:text-emerald-400 transition">
                    Credit Health Score
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/transactions')} className="hover:text-emerald-400 transition">
                    Transactions Stream
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Architecture</div>
              <ul className="space-y-1.5 text-slate-400">
                <li>Google Gemini 2.0 API</li>
                <li>Sandbox.co.in Bank APIs</li>
                <li>Tiger Data / TimescaleDB</li>
                <li>Supabase PostgreSQL</li>
                <li>ElevenLabs Voice Engine</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Legal &amp; Compliance</div>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setTermsModalTab('terms');
                      setShowTermsModal(true);
                    }}
                    className="hover:text-emerald-400 underline"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setTermsModalTab('privacy');
                      setShowTermsModal(true);
                    }}
                    className="hover:text-emerald-400 underline"
                  >
                    Privacy Policy &amp; Security
                  </button>
                </li>
                <li>
                  <a
                    href="https://github.com/Bhupendra-glitch/Credimerge"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-emerald-400"
                  >
                    GitHub Open Source Repo ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>© 2026 CrediMerge Platform. Built with React 18, TypeScript, and Google Gemini AI.</div>
            <div className="font-mono text-slate-600">
              v2.4.0 · TEST SANDBOX ACTIVE
            </div>
          </div>
        </div>
      </footer>

      {/* Terms & Privacy Modal */}
      <TermsPrivacyModal
        isOpen={showTermsModal}
        initialTab={termsModalTab}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setShowTermsModal(false)}
      />
    </div>
  );
}
