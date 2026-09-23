import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const isValidUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<User>;
  const requiredTextFields: Array<keyof User> = ['user_id', 'worker_type', 'risk_band'];
  const requiredNumberFields: Array<keyof User> = [
    'age', 'monthly_income', 'income_stability_score', 'monthly_expenses',
    'monthly_savings', 'existing_debt', 'monthly_emi', 'credit_card_balance',
    'bnpl_balance', 'vehicle_loan_outstanding', 'active_loan_count',
    'repayment_rate', 'missed_payments_12m', 'foir_pct', 'monthly_cashflow',
    'cashflow_score', 'forecast_30d_cashflow', 'forecast_60d_cashflow',
    'forecast_90d_cashflow',
  ];

  return requiredTextFields.every((field) => typeof candidate[field] === 'string')
    && requiredNumberFields.every((field) => typeof candidate[field] === 'number' && Number.isFinite(candidate[field]));
};

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

      if (!isValidUser(parsedUser)) {
        localStorage.removeItem('credimerge_token');
        localStorage.removeItem('credimerge_user');
        setLoading(false);
        return;
      }

      setToken(savedToken);
      setUser(parsedUser);
      if (savedToken.startsWith('demo-')) {
        setLoading(false);
        return;
      }

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

  const refreshUser = async () => {
    if (!token || token.startsWith('demo-')) {
      return;
    }

    try {
      const response = await api.getMe();
      const nextUser = response.data as User;

      if (!isValidUser(nextUser)) {
        logout();
        return;
      }

      setUser(nextUser);
      localStorage.setItem('credimerge_user', JSON.stringify(nextUser));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}