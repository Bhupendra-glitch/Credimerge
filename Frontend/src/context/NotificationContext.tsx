import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  category: 'payment' | 'alert' | 'insight' | 'security';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'time'>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY_PREFIX = 'credimerge_notifications_';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.userId || user?.user_id || 'guest';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Generate personalized financial notifications based on user data
  const defaultNotifications = useMemo((): NotificationItem[] => {
    if (!user) return [];

    const now = Date.now();
    const items: NotificationItem[] = [
      {
        id: 'notif-payment-upcoming',
        title: 'Upcoming EMI Due',
        message: `Your monthly EMI of ₹${(user.monthly_emi || 2200).toLocaleString('en-IN')} is scheduled for auto-debit on the 15th. Ensure adequate surplus in your account.`,
        time: '2 hours ago',
        timestamp: now - 2 * 3600 * 1000,
        category: 'payment',
        priority: 'high',
        read: false,
        actionLabel: 'View EMI Breakdown',
        actionPath: '/emi',
      },
      {
        id: 'notif-consolidation-saving',
        title: 'Loan Consolidation Opportunity',
        message: `Consolidating your ${user.active_loan_count || 2} existing debts into a single structured loan could reduce your FOIR from ${user.foir_pct || 6.5}% and free up cash flow.`,
        time: '5 hours ago',
        timestamp: now - 5 * 3600 * 1000,
        category: 'insight',
        priority: 'medium',
        read: false,
        actionLabel: 'Simulate Consolidation',
        actionPath: '/home',
      },
      {
        id: 'notif-credit-health-score',
        title: 'Credit Health Score Updated',
        message: `Your cashflow stability score is currently ${user.cashflow_score || 65}/100 (${user.risk_band || 'Low Risk'}). Monthly surplus stands at ₹${(user.monthly_cashflow || 16000).toLocaleString('en-IN')}.`,
        time: '1 day ago',
        timestamp: now - 24 * 3600 * 1000,
        category: 'alert',
        priority: 'medium',
        read: false,
        actionLabel: 'Check Credit Health',
        actionPath: '/credit-health',
      },
      {
        id: 'notif-security-check',
        title: 'Security & Verification Verified',
        message: 'Your account session is active with encrypted JWT authentication. Remember Me preferences applied.',
        time: '2 days ago',
        timestamp: now - 48 * 3600 * 1000,
        category: 'security',
        priority: 'low',
        read: true,
      },
    ];

    if (user.foir_pct && user.foir_pct > 10) {
      items.unshift({
        id: 'notif-foir-warning',
        title: 'Debt Stress Warning',
        message: `Your Fixed Obligation to Income Ratio (FOIR) is elevated at ${user.foir_pct}%. Consider paying down high-interest credit card debt.`,
        time: '30 mins ago',
        timestamp: now - 1800 * 1000,
        category: 'alert',
        priority: 'high',
        read: false,
        actionLabel: 'Review Debt Profile',
        actionPath: '/emi',
      });
    }

    return items;
  }, [user]);

  // Load from localStorage or initialize with personalized defaults
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
          return;
        }
      } catch (err) {
        console.warn('Failed to parse saved notifications', err);
      }
    }

    setNotifications(defaultNotifications);
  }, [userId, defaultNotifications]);

  // Sync state changes to localStorage
  const saveToStorage = (updated: NotificationItem[]) => {
    setNotifications(updated);
    if (user) {
      const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveToStorage(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveToStorage(updated);
  };

  const dismissNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveToStorage(updated);
  };

  const clearAll = () => {
    saveToStorage([]);
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'time'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      time: 'Just now',
      read: false,
    };
    saveToStorage([newNotif, ...notifications]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAll,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
