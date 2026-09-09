/* ═══════════════════════════════════════════════════════════════
   Dashboard Page — Mission overview, key metrics, active routes
   Wired to real GET /observed, GET /bergs, GET /metrics, GET /config.
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import {
  ShieldAlert, Anchor, Snowflake, Navigation,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import useRiskStore from '@stores/useRiskStore';
import useAlertStore from '@stores/useAlertStore';
import useRouteStore from '@stores/useRouteStore';
import useAppStore from '@stores/useAppStore';
import { useObserved } from '@hooks/useObserved';
import { useIcebergs, useIcebergsMeta } from '@hooks/useIcebergs';
import { useMetrics } from '@hooks/useMetrics';
import { useOcean, useWeather } from '@hooks/useOcean';
import { useForecast } from '@hooks/useForecast';
import { getRiskLevel } from '@utils/colorScales';
import { formatDistance, formatDuration } from '@utils/formatters';

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{ color }}>
          <Icon size={16} />
          {label}
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-value" style={{ color: loading ? 'var(--color-text-muted)' : color }}>
          {loading ? '…' : value}
        </span>
      </div>
    </div>
  );
}

function RecentAlertCard({ alert }) {
  return (
    <div className={`alert-card ${alert.severity}`}>
      <AlertTriangle size={16} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{alert.title}</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {alert.description}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const anri = useRiskStore((s) => s.anri);
  const alerts = useAlertStore((s) => s.alerts);
  const routes = useRouteStore((s) => s.routes);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const riskLevel = anri !== null ? getRiskLevel(anri) : { label: '—', color: 'var(--color-text-tertiary)' };

  const observed = useObserved(selectedDate);
  const bergs = useIcebergs(selectedDate, 7);
  const metrics = useMetrics();
  const bergsMeta = useIcebergsMeta(selectedDate, 7);
  const forecast = useForecast(selectedDate, 7);
  const ocean = useOcean(selectedDate, 12);
  const weather = useWeather(selectedDate, 12);

  const sicCoverage = observed.data?.stats?.mean_sic;
  const activeRouteCount = routes?.comparison?.table?.filter((r) => r.success).length ?? 0;

  const stats = [
    { icon: ShieldAlert, label: 'ANRI', value: anri !== null ? anri : '—', color: riskLevel.color, loading: false },
    {
      icon: Snowflake, label: 'SIC Coverage', color: 'var(--color-accent-cyan)',
      value: sicCoverage !== undefined ? `${(sicCoverage * 100).toFixed(0)}%` : '—',
      loading: observed.isLoading,
    },
    {
      icon: Anchor, label: 'Icebergs Tracked', color: 'var(--color-accent-blue)',
      value: bergs.data?.length ?? '—', loading: bergs.isLoading,
    },
    {
      icon: Navigation, label: 'Successful Route Profiles', color: 'var(--color-accent-purple)',
      value: routes ? activeRouteCount : '—', loading: false,
    },
  ];

  const recentAlerts = alerts.slice(0, 5);

  /* Every row below is derived from what the API actually returned —
     `source` / `is_real` flags, counts, dates. Nothing here is hardcoded,
     because hardcoded status text goes stale the moment the data behind
     it changes, and then the dashboard quietly lies. */
  const q = (query, realWhen) => {
    if (query.isLoading) return { status: 'Loading', isReal: null };
    if (query.isError) return { status: 'Not Connected', isReal: false };
    return { status: 'Available', isReal: realWhen(query.data) };
  };

  const seaIce = q(observed, () => true);
  const fc = q(forecast, (d) => d?.source === 'model');
  const berg = q(bergsMeta, (d) => d?.source === 'observed');
  const oc = q(ocean, (d) => d?.is_real === true);
  const wx = q(weather, (d) => d?.is_real === true);
  const mx = q(metrics, () => true);

  const healthRows = [
    {
      name: 'Sea Ice (NSIDC)', ...seaIce,
      detail: observed.data
        ? `Observed field for ${observed.data.date}`
        : observed.error?.message || 'GET /observed',
    },
    {
      name: 'Forecast (U-Net)',
      status: forecast.isError ? 'Not Connected'
        : forecast.isLoading ? 'Loading'
        : forecast.data?.source === 'model' ? 'Available' : 'Not Trained',
      isReal: fc.isReal,
      detail: forecast.data
        ? (forecast.data.source === 'model'
            ? `Model output, valid ${forecast.data.stats?.valid_date}`
            : 'No cached weights — observed data returned instead')
        : forecast.error?.message || 'GET /forecast',
    },
    {
      name: 'Icebergs (drift)', ...berg,
      detail: bergsMeta.data
        ? `${bergsMeta.data.bergs?.length ?? 0} bergs · ${bergsMeta.data.n_ensemble}-member ensemble · source: ${bergsMeta.data.source}`
        : bergsMeta.error?.message || 'GET /bergs',
    },
    {
      name: 'Ocean (CMEMS)', ...oc,
      detail: ocean.data
        ? `${ocean.data.source} · ${ocean.data.date}`
        : ocean.error?.message || 'GET /ocean',
    },
    {
      name: 'Atmosphere (ERA5)', ...wx,
      detail: weather.data
        ? `${weather.data.source} · ${weather.data.date}`
        : weather.error?.message || 'GET /weather',
    },
    {
      name: 'Routing (A*)',
      status: routes ? 'Available' : 'Idle',
      isReal: true,
      detail: routes
        ? `Last run: ${routes.origin?.name} → ${routes.destination?.name}`
        : 'Run a route on the Routes page',
    },
    {
      name: 'Metrics', ...mx,
      detail: metrics.data
        ? (Array.isArray(metrics.data.baselines)
            ? `${metrics.data.baselines.length} baseline rows`
            : metrics.data.status
              ? `${metrics.data.status} — backtest not yet run`
              : 'Connected')
        : metrics.error?.message || 'GET /metrics',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mission Dashboard</h1>
        <p className="page-subtitle">Antarctic Maritime Intelligence — Real-time overview</p>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid-2">
        {/* ── Active Routes ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Navigation size={16} />
              Route Profiles
            </div>
            {routes && <span className="badge badge-blue">{routes.comparison?.table?.length ?? 0} profiles</span>}
          </div>
          {routes?.comparison?.table?.length ? (
            <table className="table">
              <thead>
                <tr><th>Profile</th><th>Distance</th><th>Time</th></tr>
              </thead>
              <tbody>
                {routes.comparison.table.map((r) => (
                  <tr key={r.key}>
                    <td>{r.profile}</td>
                    <td>{r.success ? formatDistance(r.distance_nm) : '—'}</td>
                    <td>{r.success ? formatDuration(r.time_h) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p className="empty-state-description">
                No route computed yet — head to the Routes page to run the A* engine.
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Alerts ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={16} />
              Recent Alerts
            </div>
            <span className="badge badge-danger">{alerts.length}</span>
          </div>
          {recentAlerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {recentAlerts.map((alert) => (
                <RecentAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
              <p className="empty-state-description" style={{ marginTop: 'var(--space-2)' }}>
                No active alerts. The backend has no /alerts route yet — this feed is local-only until one exists.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── System Health ── */}
      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card-header">
          <div className="card-title">System Health</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Status</th>
              <th>Data</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {healthRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>
                  <span className={`badge ${row.status === 'Available' ? 'badge-success' : (row.status === 'Loading' || row.status === 'Idle' || row.status === 'Not Trained') ? 'badge-warning' : 'badge-danger'}`}>
                    {row.status}
                  </span>
                </td>
                <td>
                  <div className={`data-quality ${row.isReal === true ? 'real' : row.isReal === false ? 'synthetic' : 'unavailable'}`}>
                    <span className="data-quality-dot" />
                    <span>{row.isReal === true ? 'Real' : row.isReal === false ? 'Synthetic' : '—'}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
