/* ═══════════════════════════════════════════════════════════════
   Sidebar — Navigation with sections and icons
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Snowflake, Anchor, Navigation,
  Cloud, Waves, Route, ShieldAlert, Play, BarChart3,
  Bell, Bot, Settings, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import useAlertStore from '@stores/useAlertStore';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/map', icon: Map, label: 'Map' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/ice', icon: Snowflake, label: 'Sea Ice' },
      { to: '/icebergs', icon: Anchor, label: 'Icebergs' },
      { to: '/trajectory', icon: Navigation, label: 'Trajectory' },
      { to: '/weather', icon: Cloud, label: 'Weather' },
      { to: '/ocean', icon: Waves, label: 'Ocean' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { to: '/routes', icon: Route, label: 'Routes' },
      { to: '/risk', icon: ShieldAlert, label: 'Risk (ANRI)' },
      { to: '/simulation', icon: Play, label: 'Simulation' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/alerts', icon: Bell, label: 'Alerts', showBadge: true },
      { to: '/copilot', icon: Bot, label: 'AI Copilot' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const unreadCount = useAlertStore((s) => s.unreadCount);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🧊</span>
        </div>
        <span className="sidebar-title">CryoNav</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div className="nav-section" key={section.title}>
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={18} />
                <span className="nav-label">{item.label}</span>
                {item.showBadge && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button className="sidebar-collapse-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>
  );
}
