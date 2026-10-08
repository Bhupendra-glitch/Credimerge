import React, { useState } from 'react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  initialTab?: 'terms' | 'privacy';
}

export default function TermsPrivacyModal({
  isOpen,
  onClose,
  onAccept,
  initialTab = 'terms',
}: TermsPrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-sm border border-emerald-500/20">
              📜
            </span>
            <h2 className="text-lg font-bold text-slate-100">
              Legal &amp; Compliance Information
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'terms'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'privacy'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-300 space-y-4">
          {activeTab === 'terms' ? (
            <>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                Last updated: October 2026 · CrediMerge Platform Agreement
              </div>
              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  1. Acceptance of Terms
                </h3>
                <p>
                  By creating an account or accessing CrediMerge, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use our services.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  2. Purpose &amp; Non-Advisory Nature
                </h3>
                <p>
                  CrediMerge is an analytics and decision-support prototype built to assist gig workers, delivery drivers, and micro-merchants in understanding their debt commitments, cash flow volatility, and loan consolidation opportunities. All credit health scores, simulations, and AI suggestions are estimates and do not constitute official bureau scores or binding financial advice.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  3. User Responsibilities &amp; Account Security
                </h3>
                <p>
                  You are responsible for maintaining the confidentiality of your credentials and all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  4. Uploaded Financial Documents
                </h3>
                <p>
                  When uploading bank statements, credit card statements, or loan documents, you certify that you own the records or have legal authorization to upload them for personal financial analysis.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  5. Limitation of Liability
                </h3>
                <p>
                  CrediMerge and its maintainers shall not be liable for any indirect, incidental, or consequential damages resulting from loan decisions, lender rejections, or consolidation choices made based on platform estimates.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                Last updated: October 2026 · CrediMerge Privacy Commitment
              </div>
              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  1. Information We Collect
                </h3>
                <p>
                  We collect information necessary to compute cash flow stability and debt management simulations:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li>Account info: Name, email address, worker category.</li>
                  <li>Financial inputs: Self-reported monthly income, expenses, debt balances, and EMIs.</li>
                  <li>Extracted data: Transaction summaries from uploaded statements processed by AI document parsers.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  2. How Your Data Is Used
                </h3>
                <p>
                  Your data is used solely to generate debt consolidation simulations, credit health indicators, and cash flow projections within your private dashboard session. We do not sell your personal financial records to third-party lenders or advertising brokers.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  3. Security &amp; Encryption
                </h3>
                <p>
                  Passwords are encrypted using industry-standard bcrypt hashing with a work factor of 12. Authentication sessions use JSON Web Tokens (JWT) signed with secure HMAC-SHA256 secrets.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 text-base mb-1">
                  4. Your Rights
                </h3>
                <p>
                  You have the right to request deletion of your account, reset your password, and download or remove your uploaded statement records at any time.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <p className="text-xs text-slate-400">
            Accepting confirms you have reviewed and agree to both policies.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:opacity-90 shadow-md transition"
            >
              Accept &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
