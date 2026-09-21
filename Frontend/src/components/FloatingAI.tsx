import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { user } = useAuth();

  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: 'Hi! I can help you understand your EMI and credit health. Ask me anything.',
    },
  ]);

  const answer = (q: string): string => {
    if (!user) return 'Please log in first.';
    const lower = q.toLowerCase().replace(/[?!.]/g, '');

    if (
      lower.includes('emi') &&
      (lower.includes('total') ||
        lower.includes('monthly') ||
        lower.includes('amount') ||
        lower.includes('kitna') ||
        lower.includes('how much'))
    ) {
      return `Your total monthly EMI is ₹${user.monthly_emi.toLocaleString('en-IN')}.`;
    }
    if (lower.includes('emi')) {
      return `Your total monthly EMI is ₹${user.monthly_emi.toLocaleString('en-IN')}. You have ${user.active_loan_count} active loans.`;
    }
    if (lower.includes('score') || lower.includes('health')) {
      return `Your credit health score is ${user.cashflow_score}/100 — ${user.risk_band}.`;
    }
    if (lower.includes('consolidat')) {
      return `You have ${user.active_loan_count} active loans totaling ₹${user.existing_debt.toLocaleString('en-IN')}. Consolidation can reduce your EMI but may extend tenure, increasing total interest. Compare on the EMI page.`;
    }
    if (lower.includes('highest') && lower.includes('interest')) {
      return `Your Credit Card at 36% is likely your most expensive debt. Prioritize paying it off first.`;
    }
    if (lower.includes('safe')) {
      const safe = Math.min(
        user.monthly_income * 0.4 - user.monthly_emi,
        user.monthly_cashflow * 0.5
      );
      return `Your safe EMI capacity is ₹${safe.toFixed(0)}/month. This keeps your FOIR under 40%.`;
    }
    if (lower.includes('loan') || lower.includes('outstanding')) {
      return `You have ${user.active_loan_count} loans with ₹${user.existing_debt.toLocaleString('en-IN')} outstanding. Check the EMI page for details.`;
    }
    if (lower.includes('income')) {
      return `Your monthly income is ₹${user.monthly_income.toLocaleString('en-IN')}.`;
    }
    if (lower.includes('surplus') || lower.includes('savings')) {
      return `Your monthly surplus is ₹${user.monthly_cashflow.toLocaleString('en-IN')}.`;
    }
    return 'I can answer questions about your EMI, loans, credit health, or financial snapshot. Try asking "What is my total EMI?" or "Why is my score this?"';
  };

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [
      ...m,
      { role: 'user', text: q },
      { role: 'ai', text: answer(q) },
    ]);
    setInput('');
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 shadow-2xl hover:scale-105 transition flex items-center justify-center text-2xl z-50"
        title="AI Assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[90vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-slate-700">
            <h3 className="font-bold text-slate-100">🤖 CrediMerge AI</h3>
            <p className="text-xs text-slate-400">Explains your financial data</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm p-3 rounded-lg max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-blue-500/20 border border-blue-500/40 ml-auto text-slate-100'
                    : 'bg-slate-800/80 border border-slate-700 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="p-3 border-t border-slate-700 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}