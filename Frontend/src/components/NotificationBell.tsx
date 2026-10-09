import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NotificationItem } from '../context/NotificationContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayedNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const getCategoryIcon = (category: NotificationItem['category']) => {
    switch (category) {
      case 'payment':
        return '💳';
      case 'alert':
        return '⚠️';
      case 'insight':
        return '💡';
      case 'security':
        return '🛡️';
      default:
        return '🔔';
    }
  };

  const getPriorityBadge = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        title="View notifications"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-400 transition"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-black shadow-md ring-2 ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-fade-in auth-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex border-b border-slate-800 bg-slate-950/30 px-3 py-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {displayedNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-semibold text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors relative group hover:bg-slate-800/40 ${
                    !notif.read ? 'bg-emerald-500/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-bold truncate ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                          {notif.title}
                        </span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold ${getPriorityBadge(notif.priority)}`}>
                          {notif.priority}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-[10px] text-slate-500">
                          {notif.time}
                        </span>

                        <div className="flex items-center gap-2">
                          {notif.actionLabel && notif.actionPath && (
                            <button
                              type="button"
                              onClick={() => {
                                markAsRead(notif.id);
                                setIsOpen(false);
                                navigate(notif.actionPath!);
                              }}
                              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                            >
                              {notif.actionLabel} →
                            </button>
                          )}

                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(notif.id)}
                              title="Mark as read"
                              className="text-[10px] text-slate-500 hover:text-slate-300"
                            >
                              ✓ Read
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => dismissNotification(notif.id)}
                            title="Dismiss"
                            className="text-[11px] text-slate-500 hover:text-red-400 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="border-t border-slate-800 bg-slate-950/60 p-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/home');
                setTimeout(() => {
                  const section = document.getElementById('notification-center');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 py-1"
            >
              View Full Notification Center ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
