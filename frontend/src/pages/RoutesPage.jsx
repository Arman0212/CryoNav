/* Routes Page — Route planning, comparison, cost breakdown
   Wired to the real backend: POST /route (via useRouteCalculation) and
   GET /config (via useConfig) for the actual origin/station list. */
import React, { useEffect, useMemo } from 'react';
import { Route as RouteIcon, MapPin, Fuel, ShieldAlert, Compass, AlertTriangle, CheckCircle2 } from 'lucide-react';
import useRouteStore from '@stores/useRouteStore';
import useAppStore from '@stores/useAppStore';
import { useConfig } from '@hooks/useConfig';
import { useRouteCalculation } from '@hooks/useRouteCalculation';
import { formatDistance, formatDuration, formatFuel } from '@utils/formatters';

const WEIGHT_LABELS = {
  wTime: 'Time',
  wFuel: 'Fuel',
  wRisk: 'Ice/Berg Risk',
};

function formatCell(key, value) {
  if (value === undefined || value === null) return '—';
  switch (key) {
    case 'distance_nm':
      return formatDistance(value);
    case 'time_h':
      return formatDuration(value);
    case 'fuel_t':
      return formatFuel(value);
    case 'ice_hours_03':
    case 'ice_hours_07':
      return `${value.toFixed(1)} h`;
    case 'max_berg_risk':
      return value.toFixed(2);
    default:
      return String(value);
  }
}

export default function RoutesPage() {
  const {
    origin, destination, costWeights, routes,
    setOrigin, setDestination, setCostWeight, setRoutes,
    isCalculating, setCalculating,
  } = useRouteStore();
  const selectedDate = useAppStore((s) => s.selectedDate);

  const { data: config, isLoading: configLoading, isError: configError } = useConfig();
  const mutation = useRouteCalculation();

  /** Merge origins + stations from /config into one selectable waypoint list */
  const waypoints = useMemo(() => {
    if (!config) return [];
    const fromDict = (dict) =>
      Object.entries(dict || {}).map(([id, w]) => ({ id, name: w.name || id, lat: w.lat, lon: w.lon }));
    return [...fromDict(config.origins), ...fromDict(config.stations)];
  }, [config]);

  /* Default origin/destination to the backend's own defaults once config loads */
  useEffect(() => {
    if (!waypoints.length) return;
    if (!origin) {
      const def = waypoints.find((w) => w.id === 'cape_town') || waypoints[0];
      setOrigin(def);
    }
    if (!destination) {
      const def = waypoints.find((w) => w.id === 'bharati') || waypoints[1] || waypoints[0];
      setDestination(def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  const handleCalculate = async () => {
    if (!origin || !destination) return;
    setCalculating(true);
    try {
      const result = await mutation.mutateAsync({
        origin: origin.id,
        destination: destination.id,
        departDate: selectedDate,
        wTime: costWeights.wTime,
        wFuel: costWeights.wFuel,
        wRisk: costWeights.wRisk,
      });
      setRoutes(result);
    } finally {
      setCalculating(false);
    }
  };

  const headers = routes?.comparison?.headers || [];
  const rows = routes?.comparison?.table || [];
  const rejections = routes?.comparison?.rejections || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Route Planning</h1>
        <p className="page-subtitle">Time-expanded A* routing with POLARIS cost model</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
        {/* Route Planner */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Compass size={16} /> Route Planner</div>
          </div>
          {configError && (
            <div className="alert-card warning">
              <span>Could not load /config — is the CryoNav backend running at the configured API_BASE_URL?</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)', display: 'block' }}>
                <MapPin size={12} /> Origin
              </label>
              <select
                disabled={configLoading || !waypoints.length}
                value={origin?.id || ''}
                onChange={(e) => setOrigin(waypoints.find((w) => w.id === e.target.value))}
                style={{ width: '100%', padding: 'var(--space-2)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-primary)' }}
              >
                {waypoints.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)', display: 'block' }}>
                <MapPin size={12} /> Destination
              </label>
              <select
                disabled={configLoading || !waypoints.length}
                value={destination?.id || ''}
                onChange={(e) => setDestination(waypoints.find((w) => w.id === e.target.value))}
                style={{ width: '100%', padding: 'var(--space-2)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-primary)' }}
              >
                {waypoints.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ marginTop: 'var(--space-2)' }}
              onClick={handleCalculate}
              disabled={isCalculating || mutation.isPending || !origin || !destination}
            >
              <RouteIcon size={16} /> {mutation.isPending ? 'Calculating…' : 'Calculate Routes'}
            </button>
            {mutation.isError && (
              <div className="alert-card critical">
                <span>{mutation.error?.response?.data?.detail || mutation.error?.message || 'Route calculation failed'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost Weight Sliders — matches POST /route's w_time / w_fuel / w_risk exactly */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={16} /> Cost Weights (POLARIS)</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Object.entries(costWeights).map(([key, value]) => (
              <div className="range-slider" key={key}>
                <label>
                  <span>{WEIGHT_LABELS[key] || key}</span>
                  <span className="text-mono" style={{ color: 'var(--color-accent-cyan)' }}>{value.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={value}
                  onChange={(e) => setCostWeight(key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <div className="card-footer" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            Defaults match config/routing.yaml's "balanced" profile (w_time=1.0, w_fuel=0.5, w_risk=2.0).
          </div>
        </div>
      </div>

      {/* Route Comparison Table — driven by the real comparison.headers/table from POST /route */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><RouteIcon size={16} /> Route Comparison</div>
          {routes?.depart_date && (
            <span className="badge badge-blue">{routes.origin?.name} → {routes.destination?.name} · {routes.depart_date}</span>
          )}
        </div>
        {rows.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h.key} style={{ textAlign: h.align }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {headers.map((h) => (
                    <td key={h.key} style={{ textAlign: h.align, color: h.key === 'profile' ? undefined : 'var(--color-text-secondary)' }}>
                      {h.key === 'profile' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {row.success ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} /> : <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />}
                          {row.profile}
                        </span>
                      ) : (
                        formatCell(h.key, row[h.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <Fuel size={32} style={{ color: 'var(--color-text-tertiary)', opacity: 0.4 }} />
            <p className="empty-state-description" style={{ marginTop: 'var(--space-3)' }}>
              Select an origin and destination, then Calculate Routes to run the real A* engine.
            </p>
          </div>
        )}

        {rejections.length > 0 && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {rejections.map((r) => (
              <div key={r.key} className={`alert-card ${r.recommended ? 'info' : 'warning'}`}>
                <span><strong>{r.profile}:</strong> {r.reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card-footer" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ Note: Iceberg risk is currently zeroed out server-side (berg_risk = np.zeros in POST /route). Routes do NOT avoid icebergs until the backend wires berg propagation into routing.
        </div>
      </div>
    </div>
  );
}
