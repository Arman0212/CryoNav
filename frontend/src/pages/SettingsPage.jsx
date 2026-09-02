/* Settings Page — Data sources, vessel config, model versions */
import React from 'react';
import { Settings as SettingsIcon, Database, Ship, Cpu, Globe } from 'lucide-react';
import { DATA_SOURCES, VESSEL_TYPES } from '@utils/constants';
import { useConfig } from '@hooks/useConfig';

export default function SettingsPage() {
  const { data: config, isLoading: configLoading, isError: configError } = useConfig();
  const ship = config?.ship;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration, data source status, model versions</p>
      </div>

      {/* Data Source Status */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-header">
          <div className="card-title"><Database size={16} /> Data Sources</div>
        </div>
        <table className="table">
          <thead>
            <tr><th>Source</th><th>Type</th><th>Organization</th><th>Status</th><th>Data Quality</th><th>Last Update</th></tr>
          </thead>
          <tbody>
            {[
              { ...DATA_SOURCES.NSIDC, status: 'Available', isReal: true, lastUpdate: '2024 (in cube)' },
              { ...DATA_SOURCES.ERA5, status: 'Partial', isReal: true, lastUpdate: '2023 only' },
              { ...DATA_SOURCES.CMEMS, status: 'Not Connected', isReal: false, lastUpdate: 'Script exists' },
              { ...DATA_SOURCES.BYU_NIC, status: 'Available', isReal: true, lastUpdate: 'Not used for validation' },
              { id: 'bathymetry', name: 'Bathymetry', type: 'Depth', org: '—', status: 'Missing', isReal: false, lastUpdate: 'No download script' },
            ].map((src) => (
              <tr key={src.id}>
                <td style={{ fontWeight: 600 }}>{src.name}</td>
                <td>{src.type}</td>
                <td>{src.org}</td>
                <td>
                  <span className={`badge ${src.status === 'Available' ? 'badge-success' : src.status === 'Partial' ? 'badge-warning' : 'badge-danger'}`}>
                    {src.status}
                  </span>
                </td>
                <td>
                  <div className={`data-quality ${src.isReal ? 'real' : 'synthetic'}`}>
                    <span className="data-quality-dot" /><span>{src.isReal ? 'Real' : 'Synthetic'}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{src.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        {/* Vessel Configuration — read-only, sourced from GET /config (config/domain.yaml).
             The routing engine's vessel physics are fixed server-side; there's no API
             to override them per-request, so this panel reflects reality instead of
             offering sliders that wouldn't actually change anything. */}
        <div className="card">
          <div className="card-header"><div className="card-title"><Ship size={16} /> Vessel Configuration</div></div>
          {configLoading && <div className="empty-state" style={{ padding: 'var(--space-6)' }}><p className="empty-state-description">Loading /config…</p></div>}
          {configError && <div className="empty-state" style={{ padding: 'var(--space-6)' }}><p className="empty-state-description">Could not reach /config.</p></div>}
          {ship && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Class</span>
                <span>{ship.class}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Name</span>
                <span>{ship.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Open-Water Speed</span>
                <span className="text-mono" style={{ color: 'var(--color-accent-cyan)' }}>{ship.open_water_speed_kn} kn</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Draft</span>
                <span className="text-mono">{ship.draft_m} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Beam</span>
                <span className="text-mono">{ship.beam_m} m</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                Fixed in config/domain.yaml — POST /route has no per-request vessel override today. {Object.values(VESSEL_TYPES).length} POLARIS classes are defined client-side in VESSEL_TYPES for future use.
              </p>
            </div>
          )}
        </div>

        {/* Model Versions */}
        <div className="card">
          <div className="card-header"><div className="card-title"><Cpu size={16} /> Model Versions</div></div>
          <table className="table">
            <thead><tr><th>Model</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Sea Ice (U-Net)</td><td><span className="model-tag">v1 · ~10M params</span></td><td><span className="badge badge-danger">Not Trained</span></td></tr>
              <tr><td>Iceberg Drift (RK4)</td><td><span className="model-tag">v1 · Physics</span></td><td><span className="badge badge-warning">Synthetic Forcing</span></td></tr>
              <tr><td>Routing (A*)</td><td><span className="model-tag">v1 · POLARIS</span></td><td><span className="badge badge-success">Operational</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
