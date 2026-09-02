/* Ocean Intelligence Page */
import React from 'react';
import { Waves, Navigation, Thermometer } from 'lucide-react';
export default function OceanPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ocean Intelligence</h1>
        <p className="page-subtitle">Ocean currents, SST, waves, SSH — Currently synthetic (CMEMS not connected)</p>
      </div>
      <div className="alert-card warning" style={{ marginBottom: 'var(--space-4)' }}>
        <span>⚠️ Ocean data is currently synthetic. CMEMS download script exists but has not been executed. Data shown is for demonstration only.</span>
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}><Navigation size={16} /> Current Speed</div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--color-accent-teal)' }}>—</span>
            <span className="stat-label">m/s</span>
          </div>
          <div className="data-quality synthetic" style={{ marginTop: 'var(--space-2)' }}>
            <span className="data-quality-dot" /><span>Synthetic</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}><Thermometer size={16} /> SST</div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--color-accent-blue)' }}>—</span>
            <span className="stat-label">°C</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}><Waves size={16} /> Wave Height</div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--color-accent-cyan)' }}>—</span>
            <span className="stat-label">meters</span>
          </div>
        </div>
      </div>
    </div>
  );
}
