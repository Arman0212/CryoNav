/* ═══════════════════════════════════════════════════════════════
   Layout Shell — Sidebar + TopBar + Content Area + StatusBar
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import Sidebar from '@components/layout/Sidebar';
import TopBar from '@components/layout/TopBar';
import StatusBar from '@components/layout/StatusBar';
import useAppStore from '@stores/useAppStore';

export default function Layout({ children }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="page-container">
          {children}
        </div>
        <StatusBar />
      </div>
    </div>
  );
}
