import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-700/50 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/home')}
          className="text-2xl font-extrabold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent"
        >
          💸 CrediMerge
        </button>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{t('language')}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-slate-100 text-sm outline-none focus:border-green-400"
              aria-label={t('language')}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
          <div className="text-right hidden md:block">
            <div className="text-slate-400 text-xs">{t('welcome')}</div>
            <div className="text-slate-100 font-bold">
              {user?.user_id} ({user?.worker_type})
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}