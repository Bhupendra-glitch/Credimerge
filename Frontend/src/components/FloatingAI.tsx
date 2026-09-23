import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();

  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: 'Hi! I can help you understand your EMI, loans, credit health, and finances. Ask me anything.',
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

      await refreshUser();
      const response = await api.chatWithAI(q, {
        user: user ?? null,
      });
      setMessages((m) => [...m, { role: 'ai', text: response.data.answer || response.data.text || 'I could not generate a response.' }]);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'I could not generate a response right now.';
      setMessages((m) => [...m, { role: 'ai', text: message }]);
    } finally {
      setLoading(false);
    }
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
              if (!loading) send();
            }}
            className="p-3 border-t border-slate-700 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? 'Thinking...' : 'Ask something...'}
              disabled={loading}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-60"
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}