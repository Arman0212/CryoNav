/* Weather Intelligence — real ERA5 reanalysis via GET /weather.

   10 m wind, 2 m temperature and mean sea-level pressure straight out of
   the data cube. Wind is the dominant forcing term in iceberg drift, so
   this is the same field the berg model integrates against. */

import React from 'react';
import { Cloud, Wind, Gauge, Thermometer } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import { useWeather } from '@hooks/useOcean';

function Stat({ icon: Icon, label, value, unit, color, loading }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 'var(--space-2)', color }}>
        <Icon size={16} /> {label}
      </div>
      <div className="stat-card">
        <span className="stat-value" style={{ color: loading ? 'var(--color-text-muted)' : color }}>
          {loading ? '…' : (value ?? '—')}
        </span>
        <span className="stat-label">{unit}</span>
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const { data, isLoading, isError, error } = useWeather(selectedDate, 8);

  const s = data?.stats;
  const fmt = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : null);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Weather Intelligence</h1>
        <p className="page-subtitle">
          10 m wind, 2 m temperature and surface pressure — ERA5 reanalysis
        </p>
      </div>

      {isError && (
        <div className="alert-card critical" style={{ marginBottom: 'var(--space-4)' }}>
          <span>{error?.response?.data?.detail || error?.message || 'Could not reach /weather'}</span>
        </div>
      )}

      {data && (
        <div className="alert-card info" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            {data.source} · {data.date}
            {data.is_real === false && ' — gap-filled for this date, not reanalysis'}
            {' · '}{data.vectors?.length ?? 0} wind vectors
          </span>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        <Stat icon={Wind} label="Mean Wind" loading={isLoading}
          value={fmt(s?.mean_wind_ms)} unit="m/s" color="var(--color-accent-cyan)" />
        <Stat icon={Wind} label="Peak Wind" loading={isLoading}
          value={fmt(s?.max_wind_ms)} unit="m/s" color="var(--color-warning)" />
        <Stat icon={Thermometer} label="Mean Air Temp" loading={isLoading}
          value={fmt(s?.mean_t2m_c)} unit="°C" color="var(--color-accent-blue)" />
        <Stat icon={Gauge} label="Mean Pressure" loading={isLoading}
          value={fmt(s?.mean_msl_hpa, 0)} unit="hPa" color="var(--color-accent-purple)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Cloud size={16} /> Wind Field</div>
          <div className="data-quality real">
            <span className="data-quality-dot" /><span>Real (ERA5)</span>
          </div>
        </div>
        <p className="empty-state-description" style={{ padding: 'var(--space-4)' }}>
          Switch on the <strong>Weather</strong> layer on the Map page to see
          the wind vectors over the domain. Wind is the largest single term
          in the iceberg momentum balance, so a strong field here usually
          means a fast-moving drift envelope on the Icebergs page.
        </p>
      </div>
    </div>
  );
}
