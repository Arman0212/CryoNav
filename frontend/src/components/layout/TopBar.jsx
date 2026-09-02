/* ═══════════════════════════════════════════════════════════════
   TopBar — Page title, date picker, alerts, connection status
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Calendar } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import useAlertStore from '@stores/useAlertStore';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/map': 'Antarctic Map',
  '/ice': 'Sea Ice Intelligence',
  '/icebergs': 'Iceberg Tracking',
  '/trajectory': 'Trajectory Analysis',
  '/weather': 'Weather Intelligence',
  '/ocean': 'Ocean Intelligence',
  '/routes': 'Route Planning',
  '/risk': 'Risk Assessment',
  '/simulation': 'Mission Simulation',
  '/analytics': 'Analytics',
  '/alerts': 'Alert Center',
  '/copilot': 'AI Copilot',
  '/settings': 'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const isConnected = useAppStore((s) => s.isConnected);
  const unreadCount = useAlertStore((s) => s.unreadCount);

  const pageTitle = PAGE_TITLES[location.pathname] || 'CryoNav';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-breadcrumb">{pageTitle}</h1>
      </div>

      <div className="topbar-right">
        {/* ── Date Selector (replaces hardcoded date) ── */}
        <label className="topbar-date" title="Select analysis date">
          <Calendar size={14} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </label>

        {/* ── Alerts Button ── */}
        <button
          className="topbar-alert-btn"
          onClick={() => navigate('/alerts')}
          aria-label={`Alerts — ${unreadCount} unread`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="topbar-alert-count">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Connection Status ── */}
        <div className="topbar-connection">
          <span className={`connection-dot ${isConnected ? '' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
