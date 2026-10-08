import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [messages, setMessages] = useState<
    { role: 'user' | 'ai'; text: string }[]
  >([
    {
      role: 'ai',
      text: 'Hi. I can help you understand your EMI, loans, credit health, and finances. Ask me anything.',
    },
  ]);

  const send = async () => {
    if (!input.trim()) return;

    const q = input.trim();

    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      if (!user) {
        throw new Error('Please log in first.');
      }

      const response = await api.chatWithAI(q);

      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text:
            response.data.answer ||
            response.data.reply ||
            response.data.text ||
            'I could not generate a response.',
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'I could not generate a response right now.';

      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 group....cm-pulse"
        title="CrediMerge AI"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />

        <span className="relative flex h-14 w-14 items-center justify-center border border-emerald-400/50 bg-[#07100b]/95 text-emerald-400 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:border-emerald-300 group-hover:bg-emerald-400 group-hover:text-black....cm-scan cm-border-glow">
          {open ? '×' : 'AI'}
        </span>
      </button>

      {/* AI panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[560px] flex flex-col overflow-hidden border border-white/[0.1] bg-[#070909]/95 backdrop-blur-2xl shadow-2xl">

          {/* Header */}
          <div className="px-5 py-5 border-b border-white/[0.07]">
            <div className="flex items-start justify-between">
              <div>
                <div className="data-mono text-[9px] uppercase tracking-[0.25em] text-emerald-400/60 mb-2">
                  Intelligence / 01
                </div>

                <h3 className="text-lg font-bold text-white">
                  CrediMerge AI
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Your financial intelligence assistant
                </p>
              </div>

              <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`
                    max-w-[88%] px-4 py-3 text-sm leading-relaxed
                    ${
                      m.role === 'user'
                        ? 'bg-emerald-400 text-black'
                        : 'border border-white/[0.07] bg-white/[0.03] text-slate-300'
                    }
                  `}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-emerald-400/70 data-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ANALYZING FINANCIAL DATA...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!loading) send();
            }}
            className="p-4 border-t border-white/[0.07]"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={loading ? 'Thinking...' : 'Ask about your finances...'}
                disabled={loading}
                className="min-w-0 flex-1 bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={loading}
                className="px-4 border border-emerald-400/40 text-emerald-400 text-xs font-semibold uppercase tracking-wider hover:bg-emerald-400 hover:text-black transition-all duration-300 disabled:opacity-40"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function buildLocalFinancialReply(
  user: NonNullable<ReturnType<typeof useAuth>['user']>,
  question: string
) {
  const income = Number(user.monthly_income).toLocaleString('en-IN');
  const emi = Number(user.monthly_emi).toLocaleString('en-IN');
  const surplus = Number(user.monthly_cashflow).toLocaleString('en-IN');
  const debt = Number(user.existing_debt).toLocaleString('en-IN');
  const normalizedQuestion = question.toLowerCase();

  if (normalizedQuestion.includes('emi')) {
    return `Your current monthly EMI is ₹${emi}. Your available monthly surplus is ₹${surplus}. Keep any new EMI comfortably below your surplus and avoid taking on debt if it would make cashflow negative.`;
  }

  if (
    normalizedQuestion.includes('debt') ||
    normalizedQuestion.includes('loan')
  ) {
    return `Your recorded outstanding debt is ₹${debt}, against monthly income of ₹${income}. Prioritize the highest-interest balance first and keep an emergency buffer before making additional repayments.`;
  }

  if (
    normalizedQuestion.includes('credit') ||
    normalizedQuestion.includes('score')
  ) {
    return `Your cashflow health score is ${user.cashflow_score}/100 (${user.risk_band}). Consistent repayments, lower utilization, and a positive monthly surplus can support healthier finances.`;
  }

  return `Based on your profile, monthly income is ₹${income}, EMI is ₹${emi}, and surplus is ₹${surplus}. I can help explain your EMI, debt, credit-health score, or budgeting choices.`;
}