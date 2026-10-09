import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function NotificationSection() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<'all' | 'payment' | 'alert' | 'insight' | 'security'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Preference switches state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [insightAlerts, setInsightAlerts] = useState(true);

  // Filter logic
  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    if (showUnreadOnly && item.read) {
      return false;
    }
    return true;
  });

  const getCategoryMeta = (category: NotificationItem['category']) => {
    switch (category) {
      case 'payment':
        return {
          icon: '💳',
          label: 'Payment',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          accentBorder: 'border-l-emerald-400',
        };
      case 'alert':
        return {
          icon: '⚠️',
          label: 'Alert',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          accentBorder: 'border-l-amber-400',
        };
      case 'insight':
        return {
          icon: '💡',
          label: 'Insight',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          accentBorder: 'border-l-cyan-400',
        };
      case 'security':
        return {
          icon: '🛡️',
          label: 'Security',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          accentBorder: 'border-l-blue-400',
        };
      default:
        return {
          icon: '🔔',
          label: 'Notice',
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          accentBorder: 'border-l-slate-400',
        };
    }
  };

  const getPriorityMeta = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'high':
        return {
          badge: 'High Priority',
          style: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
      case 'medium':
        return {
          badge: 'Medium',
          style: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      default:
        return {
          badge: 'Normal',
          style: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        };
    }
  };

  return (
    <section id="notification-center" className="mt-16 sm:mt-20 scroll-mt-24">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="data-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/70 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Intelligence Stream
          </div>

          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <span>Notifications &amp; Alerts</span>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {unreadCount} unread
              </span>
            )}
          </h2>

          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Real-time reminders, cash flow alerts, debt stress warnings, and intelligence recommendations tailored to your profile.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3.5 py-2 text-xs font-bold text-slate-200 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] hover:border-emerald-400/40 rounded-xl transition flex items-center gap-1.5"
            >
              <span>✓</span> Mark All as Read
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-200 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/40 rounded-xl transition flex items-center gap-1.5"
          >
            <span>⚙️</span> Preferences
          </button>
        </div>
      </div>

      {/* Filter Tabs & Quick Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Alerts', icon: '📋' },
            { id: 'payment', label: 'Payments', icon: '💳' },
            { id: 'alert', label: 'Risk Alerts', icon: '⚠️' },
            { id: 'insight', label: 'Insights', icon: '💡' },
            { id: 'security', label: 'Security', icon: '🛡️' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-emerald-500 text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Unread Only Toggle */}
        <div className="flex items-center gap-3 px-2 sm:px-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none hover:text-slate-200 transition">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 text-emerald-500 accent-emerald-500 focus:ring-emerald-400"
            />
            <span>Unread only</span>
          </label>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] text-slate-500 hover:text-red-400 transition"
              title="Clear all alerts"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications Grid / List */}
      <div className="space-y-3.5">
        {filteredNotifications.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className="text-base font-bold text-slate-200">
              No notifications to display
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {showUnreadOnly
                ? 'All notifications have been marked as read. Toggle off "Unread only" to view past notifications.'
                : 'Your financial intelligence stream is clear. Everything is running smoothly.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const meta = getCategoryMeta(item.category);
            const priority = getPriorityMeta(item.priority);

            return (
              <div
                key={item.id}
                className={`group relative rounded-2xl border transition-all duration-300 p-5 overflow-hidden ${
                  !item.read
                    ? 'border-emerald-500/30 bg-slate-900/90 shadow-lg shadow-emerald-950/20'
                    : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70'
                } border-l-4 ${meta.accentBorder}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Icon + Content */}
                  <div className="flex items-start gap-4">
                    <span
                      className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${meta.color}`}
                    >
                      {meta.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1">
                        <h4 className={`text-base font-bold ${!item.read ? 'text-white' : 'text-slate-200'}`}>
                          {item.title}
                        </h4>

                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${priority.style}`}
                        >
                          {priority.badge}
                        </span>

                        <span className="text-xs text-slate-500 data-mono">
                          • {item.time}
                        </span>

                        {!item.read && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                        )}
                      </div>

                      <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
                        {item.message}
                      </p>

                      {/* Interactive Actions */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {item.actionLabel && item.actionPath && (
                          <button
                            type="button"
                            onClick={() => {
                              markAsRead(item.id);
                              navigate(item.actionPath!);
                            }}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 text-black hover:bg-emerald-300 transition shadow-sm"
                          >
                            {item.actionLabel} →
                          </button>
                        )}

                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="text-xs text-slate-400 hover:text-emerald-400 transition font-medium flex items-center gap-1"
                          >
                            <span>✓</span> Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    onClick={() => dismissNotification(item.id)}
                    aria-label="Dismiss notification"
                    className="self-start sm:self-center text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preferences Modal */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚙️</span>
                <h3 className="text-base font-bold text-slate-100">
                  Notification Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400 mb-2">
                Configure which automated notifications CrediMerge generates for your account:
              </p>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Payment Due Reminders
                  </div>
                  <div className="text-xs text-slate-400">
                    Alerts 3-5 days prior to EMI auto-debit dates
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentReminders}
                  onChange={(e) => setPaymentReminders(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-500 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Cash Flow &amp; Debt Stress
                  </div>
                  <div className="text-xs text-slate-400">
                    Warnings when FOIR exceeds safe thresholds
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={riskAlerts}
                  onChange={(e) => setRiskAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-500 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Loan Consolidation Savings
                  </div>
                  <div className="text-xs text-slate-400">
                    Suggestions when cheaper interest rates are detected
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={insightAlerts}
                  onChange={(e) => setInsightAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-500 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Email Digest
                  </div>
                  <div className="text-xs text-slate-400">
                    Weekly summary sent to {user?.email || 'your registered email'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-500 accent-emerald-500"
                />
              </label>
            </div>

            <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
