import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileMenu from './ProfileMenu';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050707]/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-[76px] flex items-center justify-between">

        <button
          onClick={() => navigate('/home')}
          className="group flex items-center gap-3"
        >
          <span className="flex h-8 w-8 items-center justify-center border border-emerald-400/40 text-emerald-400 text-sm font-bold transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-black">
            C
          </span>

          <span className="text-xl font-black tracking-[-0.04em] text-white">
            Credi<span className="text-emerald-400">Merge</span>
          </span>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:block text-right">
            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-1">
              Account
            </div>

            <div className="text-sm font-medium text-slate-300">
              {user?.fullName || user?.user_id || user?.userId}
            </div>
          </div>

          <div className="h-8 w-px bg-white/[0.08] hidden md:block" />

          {/* Global Notification Bell */}
          <NotificationBell />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-400"
          >
            {theme === 'dark' ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <ProfileMenu onLogout={handleLogout} />

          <button
            onClick={handleLogout}
            className="hidden sm:block px-4 py-2 text-xs uppercase tracking-[0.12em] text-slate-400 border border-white/[0.08] hover:border-emerald-400/40 hover:text-emerald-400 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
