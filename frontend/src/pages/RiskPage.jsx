/* Risk Assessment Page — ANRI gauge + breakdown */
import React from 'react';
import { ShieldAlert, Snowflake, Anchor, Wind, Waves, Eye, Navigation } from 'lucide-react';
import useRiskStore from '@stores/useRiskStore';
import { getRiskColor, getRiskLevel } from '@utils/colorScales';

export default function RiskPage() {
  const anri = useRiskStore((s) => s.anri);
  const breakdown = useRiskStore((s) => s.breakdown);
  const riskLevel = anri !== null ? getRiskLevel(anri) : { label: 'N/A', color: 'var(--color-text-muted)' };

  const factors = [
    { key: 'seaIce', label: 'Sea Ice', icon: Snowflake, color: '#1668c9' },
    { key: 'iceberg', label: 'Iceberg', icon: Anchor, color: '#0b7fa8' },
    { key: 'wind', label: 'Wind', icon: Wind, color: '#b45309' },
    { key: 'waves', label: 'Waves', icon: Waves, color: '#0f7a6a' },
    { key: 'visibility', label: 'Visibility', icon: Eye, color: '#6d3fd4' },
    { key: 'ocean', label: 'Ocean', icon: Navigation, color: '#1d4ed8' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Risk Assessment</h1>
        <p className="page-subtitle">Antarctic Navigation Risk Index (ANRI) — Explainable risk scoring</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
        {/* ANRI Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8)' }}>
          <div className="risk-gauge" style={{ width: 200, height: 200 }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
              {/* Background circle */}
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="12" />
              {/* Risk arc */}
              <circle
                cx="100" cy="100" r="85"
                fill="none"
                stroke={anri !== null ? getRiskColor(anri) : 'var(--color-text-muted)'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(anri || 0) / 100 * 534} 534`}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.6s ease-out' }}
              />
            </svg>
            <span className="risk-gauge-value" style={{ color: anri !== null ? getRiskColor(anri) : 'var(--color-text-muted)' }}>
              {anri !== null ? anri : '—'}
            </span>
            <span className="risk-gauge-label">{riskLevel.label}</span>
          </div>
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            ANRI combines sea ice, iceberg, weather, and ocean risk factors into a single 0–100 score
          </p>
        </div>

        {/* Risk Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={16} /> Risk Breakdown</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {factors.map(({ key, label, icon: Icon, color }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Icon size={16} style={{ color, flexShrink: 0 }} />
                <span style={{ width: 80, fontSize: 'var(--font-size-sm)' }}>{label}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${breakdown[key] || 0}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s ease-out',
                    }}
                  />
                </div>
                <span className="text-mono" style={{ width: 40, textAlign: 'right', fontSize: 'var(--font-size-sm)', color }}>
                  {breakdown[key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Timeline */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Risk Evolution (Forecast Horizon)</div>
        </div>
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <p className="empty-state-description">
            Temporal risk evolution chart — Shows ANRI changes over the forecast horizon. Will be populated with Recharts time series.
          </p>
        </div>
      </div>
    </div>
  );
}
