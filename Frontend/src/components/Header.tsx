import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu';

export default function Header() {
  const { user, logout } = useAuth();
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

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden md:block text-right">
            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-1">
              Account
            </div>

            <div className="text-sm font-medium text-slate-300">
              {user?.fullName || user?.user_id || user?.userId}
            </div>
          </div>

          <div className="h-8 w-px bg-white/[0.08] hidden md:block" />

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
