/* Weather Intelligence Page */
import React from 'react';
import { Cloud, Wind, Eye, Thermometer } from 'lucide-react';
export default function WeatherPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Weather Intelligence</h1>
        <p className="page-subtitle">ERA5 atmospheric data — wind, temperature, visibility, pressure, storms</p>
      </div>
      <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        {[
          { icon: Wind, label: 'Wind Speed', value: '—', unit: 'm/s', color: 'var(--color-accent-cyan)' },
          { icon: Thermometer, label: 'Temperature', value: '—', unit: '°C', color: 'var(--color-accent-blue)' },
          { icon: Eye, label: 'Visibility', value: '—', unit: 'km', color: 'var(--color-accent-purple)' },
          { icon: Cloud, label: 'Pressure', value: '—', unit: 'hPa', color: 'var(--color-accent-teal)' },
        ].map(({ icon: Icon, label, value, unit, color }) => (
          <div className="card" key={label}>
            <div className="card-title" style={{ color, marginBottom: 'var(--space-2)' }}><Icon size={16} /> {label}</div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: 'var(--color-text-muted)' }}>{value}</span>
              <span className="stat-label">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title"><Wind size={16} /> Wind Rose</div></div>
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <p className="empty-state-description">Wind direction and speed visualization — Connect to /weather endpoint</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title"><Cloud size={16} /> Forecast Timeline</div></div>
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <p className="empty-state-description">Multi-day weather forecast chart — Recharts time series</p>
          </div>
        </div>
      </div>
    </div>
  );
}
