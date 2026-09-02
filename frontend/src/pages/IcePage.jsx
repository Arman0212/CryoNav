/* Sea Ice Intelligence Page — wired to real GET /observed and GET /forecast */
import React, { useState } from 'react';
import { Snowflake, Eye, Brain, BarChart3 } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import { useObserved } from '@hooks/useObserved';
import { useForecast } from '@hooks/useForecast';

function SicStats({ query, label }) {
  if (query.isLoading) {
    return <p className="empty-state-description" style={{ marginTop: 'var(--space-3)' }}>Loading {label}…</p>;
  }
  if (query.isError) {
    return (
      <p className="empty-state-description" style={{ marginTop: 'var(--space-3)', color: 'var(--color-danger)' }}>
        {query.error?.response?.data?.detail || query.error?.message || `Failed to load ${label}`}
      </p>
    );
  }
  const stats = query.data?.stats;
  if (!stats) return null;
  const extentKm2 = stats.ice_extent_km2 ?? stats.ice_area_km2;
  return (
    <div className="grid-2" style={{ marginTop: 'var(--space-3)', width: '100%' }}>
      <div className="stat-card" style={{ textAlign: 'center' }}>
        <span className="stat-value" style={{ color: 'var(--color-accent-cyan)' }}>{(stats.mean_sic * 100).toFixed(1)}%</span>
        <span className="stat-label">Mean SIC</span>
      </div>
      <div className="stat-card" style={{ textAlign: 'center' }}>
        <span className="stat-value" style={{ color: 'var(--color-accent-blue)' }}>{extentKm2?.toLocaleString() ?? '—'}</span>
        <span className="stat-label">Ice Extent (km²)</span>
      </div>
    </div>
  );
}

export default function IcePage() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [lead, setLead] = useState(7);

  const observed = useObserved(selectedDate);
  const forecast = useForecast(selectedDate, lead);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sea Ice Intelligence</h1>
        <p className="page-subtitle">NSIDC observed SIC and U-Net forecast comparison — {selectedDate}</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
        {/* Observed SIC Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Eye size={16} /> Observed SIC</div>
            <div className="data-quality real"><span className="data-quality-dot" /><span>Real (NSIDC)</span></div>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-8)', alignItems: 'center' }}>
            <Snowflake size={32} style={{ color: 'var(--color-accent-cyan)', opacity: 0.4 }} />
            <SicStats query={observed} label="observed SIC" />
            <p className="empty-state-description" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}>
              Grid heatmap rendering ({observed.data?.shape?.join('×') || '264×220'} cells) not yet built — stats above come straight from GET /observed.
            </p>
          </div>
        </div>

        {/* Forecast SIC Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Brain size={16} /> Forecast SIC</div>
            <div className="data-quality synthetic"><span className="data-quality-dot" /><span>Demo (U-Net not trained)</span></div>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-8)', alignItems: 'center' }}>
            <Brain size={32} style={{ color: 'var(--color-accent-purple)', opacity: 0.4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Lead days:</label>
              <input
                type="number" min={1} max={14} value={lead}
                onChange={(e) => setLead(Number(e.target.value) || 1)}
                style={{ width: 56, padding: '2px 6px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <SicStats query={forecast} label="forecast SIC" />
            <p className="empty-state-description" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}>
              GET /forecast currently returns observed data shifted by the lead — there's no trained model behind it yet.
            </p>
          </div>
        </div>
      </div>

      {/* Forecast Skill Metrics */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><BarChart3 size={16} /> Forecast Skill</div>
          <span className="model-tag">unet-v1 · not trained</span>
        </div>
        <div className="grid-3" style={{ padding: 'var(--space-4) 0' }}>
          {['RMSE', 'MAE', 'IIEE', 'F1 Score', 'Precision', 'Recall'].map((metric) => (
            <div key={metric} className="stat-card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
              <span className="stat-value" style={{ color: 'var(--color-text-muted)' }}>—</span>
              <span className="stat-label">{metric}</span>
            </div>
          ))}
        </div>
        <div className="card-footer" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          There is no per-lead skill endpoint on the backend yet (GET /metrics only returns baselines.csv / training_history.json if present on disk). See the Analytics page for what /metrics does expose.
        </div>
      </div>
    </div>
  );
}
