import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, rememberMe?: boolean) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const isValidUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, any>;
  const userIdVal = candidate.user_id || candidate.userId;
  if (!userIdVal || typeof userIdVal !== 'string') return false;

  const requiredTextFields: Array<keyof User> = ['worker_type', 'risk_band'];
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
    const isPersistent = !!localStorage.getItem('credimerge_token');
    const storage = isPersistent ? localStorage : sessionStorage;
    const savedToken = storage.getItem('credimerge_token');
    const savedUser = storage.getItem('credimerge_user');

    if (savedToken && savedUser) {
      let parsedUser: User;
      try {
        parsedUser = JSON.parse(savedUser) as User;
        if (!parsedUser.user_id && parsedUser.userId) {
          parsedUser.user_id = parsedUser.userId;
        }
      } catch {
        storage.removeItem('credimerge_token');
        storage.removeItem('credimerge_user');
        setLoading(false);
        return;
      }

      if (!isValidUser(parsedUser)) {
        storage.removeItem('credimerge_token');
        storage.removeItem('credimerge_user');
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
          const fetchedUser = {
            ...response.data,
            user_id: response.data.user_id || response.data.userId,
          };
          setUser(fetchedUser);
          storage.setItem('credimerge_user', JSON.stringify(fetchedUser));
        })
        .catch(() => {
          storage.removeItem('credimerge_token');
          storage.removeItem('credimerge_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  const login = (userData: User, authToken: string, rememberMe = true) => {
    const normalizedUser = {
      ...userData,
      user_id: userData.user_id || userData.userId || 'USER',
    };
    setUser(normalizedUser);
    setToken(authToken);

    if (rememberMe) {
      localStorage.setItem('credimerge_token', authToken);
      localStorage.setItem('credimerge_user', JSON.stringify(normalizedUser));
      sessionStorage.removeItem('credimerge_token');
      sessionStorage.removeItem('credimerge_user');
    } else {
      sessionStorage.setItem('credimerge_token', authToken);
      sessionStorage.setItem('credimerge_user', JSON.stringify(normalizedUser));
      localStorage.removeItem('credimerge_token');
      localStorage.removeItem('credimerge_user');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('credimerge_token');
    localStorage.removeItem('credimerge_user');
    sessionStorage.removeItem('credimerge_token');
    sessionStorage.removeItem('credimerge_user');
  };

  const updateUser = (userData: User) => {
    const normalizedUser = {
      ...userData,
      user_id: userData.user_id || userData.userId || 'USER',
    };
    setUser(normalizedUser);
    if (localStorage.getItem('credimerge_token')) {
      localStorage.setItem('credimerge_user', JSON.stringify(normalizedUser));
    } else {
      sessionStorage.setItem('credimerge_user', JSON.stringify(normalizedUser));
    }
  };

  const refreshUser = async () => {
    if (!token || token.startsWith('demo-')) {
      return;
    }

    try {
      const response = await api.getMe();
      const rawUser = response.data as Record<string, any>;
      const nextUser = {
        ...rawUser,
        user_id: rawUser.user_id || rawUser.userId,
      } as User;

      if (!isValidUser(nextUser)) {
        console.warn('refreshUser received incomplete user payload:', nextUser);
        return;
      }

      setUser(nextUser);
      if (localStorage.getItem('credimerge_token')) {
        localStorage.setItem('credimerge_user', JSON.stringify(nextUser));
      } else {
        sessionStorage.setItem('credimerge_user', JSON.stringify(nextUser));
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
      } else {
        console.warn('Failed to refresh user profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}