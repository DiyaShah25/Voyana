import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Plane,
  Building,
  Car,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useBookingAlerts, type ToastNotification } from './useBookingAlerts';
import type { BookingAlert, BookingType, AlertSeverity, BookingStatus } from '@/services/alertService';

function getCategoryIcon(type: BookingType) {
  switch (type) {
    case 'flight':
      return <Plane size={15} className="text-sky-400" />;
    case 'hotel':
      return <Building size={15} className="text-amber-400" />;
    case 'transport':
      return <Car size={15} className="text-emerald-400" />;
    default:
      return <Sparkles size={15} className="text-indigo-400" />;
  }
}

function getSeverityBadge(severity: AlertSeverity, status: BookingStatus) {
  switch (severity) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={12} />
          {status.toUpperCase()}
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle size={12} />
          {status.toUpperCase()}
        </span>
      );
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle size={12} />
          {status.toUpperCase()}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <Info size={12} />
          {status.toUpperCase()}
        </span>
      );
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const AlertsPanel: React.FC = () => {
  const {
    alerts,
    unreadCount,
    loading,
    toasts,
    markAsRead,
    markAllAsRead,
    dismissToast,
    simulateStatusChange,
  } = useBookingAlerts();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [simulating, setSimulating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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

  const displayedAlerts = alerts.filter((a) => (filter === 'unread' ? !a.is_read : true));

  const handleSimulate = async (status: BookingStatus) => {
    try {
      setSimulating(true);
      if (status === 'delayed') {
        await simulateStatusChange('bk-fl-881', 'delayed', 'Air traffic delay in Paris sector');
      } else if (status === 'confirmed') {
        await simulateStatusChange('bk-ht-420', 'confirmed', 'Hotel confirmation voucher issued');
      } else if (status === 'cancelled') {
        await simulateStatusChange('bk-tr-109', 'cancelled', 'Traveler requested cancellation');
      }
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      {/* Toast Notification Overlay */}
      <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast: ToastNotification) => (
          <div
            key={toast.toastId}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl shadow-indigo-500/10 text-white animate-in slide-in-from-top-4 duration-300 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white/10">{getCategoryIcon(toast.booking_type)}</span>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-wide">{toast.title}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">{toast.booking_reference}</span>
                </div>
              </div>
              <button
                onClick={() => dismissToast(toast.toastId)}
                className="text-slate-400 hover:text-white p-1 transition"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{toast.message}</p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
              {getSeverityBadge(toast.severity, toast.new_status)}
              <span className="text-slate-400">{formatRelativeTime(toast.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bell Trigger Button */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative p-2.5 rounded-full transition-all duration-200 border ${
            isOpen
              ? 'bg-indigo-600/30 border-indigo-400/60 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200 hover:text-white'
          }`}
          aria-label="View booking alerts"
          title="Booking Alerts"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-[#0a0e17] animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Alerts Popover Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  Booking Alerts
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-500/30 text-indigo-300 rounded-full border border-indigo-500/40">
                      {unreadCount} unread
                    </span>
                  )}
                </h3>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition font-medium"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs & Test Simulation Controls */}
            <div className="px-4 py-2 bg-slate-950/40 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    filter === 'all'
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    filter === 'unread'
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Quick Simulation Menu */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="hidden sm:inline">Simulate:</span>
                <button
                  onClick={() => handleSimulate('delayed')}
                  disabled={simulating}
                  title="Simulate Flight Delay"
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-[10px]"
                >
                  Delay
                </button>
                <button
                  onClick={() => handleSimulate('confirmed')}
                  disabled={simulating}
                  title="Simulate Hotel Confirmed"
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-[10px]"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleSimulate('cancelled')}
                  disabled={simulating}
                  title="Simulate Transport Cancellation"
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
              {loading && (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-indigo-400" />
                  Loading notifications...
                </div>
              )}

              {!loading && displayedAlerts.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <p className="text-slate-300 font-medium">No alerts to display</p>
                  <p className="mt-1 text-slate-500">
                    {filter === 'unread'
                      ? 'You are all caught up on your booking updates!'
                      : 'You do not have any booking alerts yet.'}
                  </p>
                </div>
              )}

              {!loading &&
                displayedAlerts.map((alert: BookingAlert) => (
                  <div
                    key={alert.id}
                    onClick={() => !alert.is_read && markAsRead(alert.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                      alert.is_read
                        ? 'opacity-70 hover:bg-white/5'
                        : 'bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white/10 mt-0.5 flex-shrink-0">
                      {getCategoryIcon(alert.booking_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {alert.title}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity, alert.new_status)}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {alert.booking_reference}
                          </span>
                        </div>

                        {!alert.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/60 border-t border-white/10 text-center text-[11px] text-slate-400">
              Realtime notifications powered by Supabase Booking Triggers
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AlertsPanel;
