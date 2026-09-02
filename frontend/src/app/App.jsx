/* ═══════════════════════════════════════════════════════════════
   CryoNav App Root — Router + Layout + WebSocket init
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import { useConnectionStatus } from '@hooks/useConnectionStatus';

/* ── Lazy-loaded Pages ── */
const DashboardPage = React.lazy(() => import('@pages/DashboardPage'));
const MapPage = React.lazy(() => import('@pages/MapPage'));
const IcePage = React.lazy(() => import('@pages/IcePage'));
const IcebergsPage = React.lazy(() => import('@pages/IcebergsPage'));
const TrajectoryPage = React.lazy(() => import('@pages/TrajectoryPage'));
const WeatherPage = React.lazy(() => import('@pages/WeatherPage'));
const OceanPage = React.lazy(() => import('@pages/OceanPage'));
const RoutesPage = React.lazy(() => import('@pages/RoutesPage'));
const RiskPage = React.lazy(() => import('@pages/RiskPage'));
const SimulationPage = React.lazy(() => import('@pages/SimulationPage'));
const AnalyticsPage = React.lazy(() => import('@pages/AnalyticsPage'));
const AlertsPage = React.lazy(() => import('@pages/AlertsPage'));
const CopilotPage = React.lazy(() => import('@pages/CopilotPage'));
const SettingsPage = React.lazy(() => import('@pages/SettingsPage'));

/** Loading fallback for lazy-loaded pages */
function PageLoader() {
  return (
    <div className="empty-state">
      <div className="spinner spinner-lg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)' }}>Loading...</p>
    </div>
  );
}

export default function App() {
  /* ── Connection indicator ──
     The real backend has no WebSocket route, so connectivity is derived
     from periodic /config health checks instead (see useConnectionStatus).
     websocketService remains available for when a WS route is added. */
  useConnectionStatus();

  return (
    <Layout>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/ice" element={<IcePage />} />
          <Route path="/icebergs" element={<IcebergsPage />} />
          <Route path="/trajectory" element={<TrajectoryPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/ocean" element={<OceanPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </React.Suspense>
    </Layout>
  );
}
