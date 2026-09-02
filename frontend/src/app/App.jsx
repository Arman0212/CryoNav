/* ═══════════════════════════════════════════════════════════════
   CryoNav App Root — Router

   Two branches:
     "/"   → LandingPage, rendered bare (no Layout chrome, page scrolls)
     "/*"  → the existing application, unchanged, inside <Layout>

   The app branch is nested so Layout keeps its original `children` API and
   every existing route keeps its original path — nothing about the
   dashboard had to move to make room for the landing page.
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import { useConnectionStatus } from '@hooks/useConnectionStatus';

/* ── Landing ── */
const LandingPage = React.lazy(() => import('@pages/landing/LandingPage'));

/* ── Lazy-loaded Application Pages ── */
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

/** Minimal fallback while the landing page chunk loads */
function LandingLoader() {
  return <div style={{ minHeight: '100vh', background: '#04060c' }} />;
}

/**
 * The existing application, unchanged.
 * Backend health polling lives here rather than in App so the public
 * landing page never triggers API calls (or error toasts) of its own.
 */
function AppShell() {
  useConnectionStatus();

  return (
    <Layout>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
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

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <React.Suspense fallback={<LandingLoader />}>
            <LandingPage />
          </React.Suspense>
        }
      />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
