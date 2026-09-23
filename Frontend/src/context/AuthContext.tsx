import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('credimerge_token');
    const savedUser = localStorage.getItem('credimerge_user');
    if (savedToken && savedUser) {
      let parsedUser: User;
      try {
        parsedUser = JSON.parse(savedUser) as User;
      } catch {
        localStorage.removeItem('credimerge_token');
        localStorage.removeItem('credimerge_user');
        setLoading(false);
        return;
      }

      setToken(savedToken);
      setUser(parsedUser);
      api.getMe()
        .then((response) => {
          setUser(response.data);
          localStorage.setItem('credimerge_user', JSON.stringify(response.data));
        })
        .catch(() => {
          localStorage.removeItem('credimerge_token');
          localStorage.removeItem('credimerge_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('credimerge_token', authToken);
    localStorage.setItem('credimerge_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('credimerge_token');
    localStorage.removeItem('credimerge_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}