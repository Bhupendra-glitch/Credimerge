import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
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
          <div className="text-right hidden md:block">
            <div className="text-slate-400 text-xs">Welcome</div>
            <div className="text-slate-100 font-bold">
              {user?.user_id} ({user?.worker_type})
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}