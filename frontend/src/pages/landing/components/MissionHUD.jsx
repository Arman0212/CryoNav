/* ═══════════════════════════════════════════════════════════════
   MissionHUD.jsx — Scientific Telemetry HUD (Light Theme)
   Displays ALL real CryoNav backend data from demoTrajectory:
   Coords, Mission Clock, ANRI Risk, Sea Ice, Wind, Vis, Berg Range,
   Tracking ID (BERG_001), and Route Metrics (Fuel MT & Distance nm).
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useMissionState } from '../animation/useMissionState';

function riskBand(v) {
  if (v <= 33) return { label: 'Low', cls: 'safe' };
  if (v <= 55) return { label: 'Moderate', cls: 'warning' };
  if (v <= 72) return { label: 'Elevated', cls: 'warning' };
  return { label: 'Critical', cls: 'critical' };
}

export default function MissionHUD({ progress = 0 }) {
  const { state, data } = useMissionState(progress);

  const h = Math.floor(state.missionTime);
  const m = Math.floor((state.missionTime - h) * 60);
  const sec = Math.floor((((state.missionTime - h) * 60) - m) * 60);
  const timeStr = `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const latStr = `${Math.abs(state.lat).toFixed(3)}° S`;
  const lonStr = `${Math.abs(state.lon).toFixed(3)}° ${state.lon < 0 ? 'W' : 'E'}`;

  const risk = Math.round(state.risk);
  const band = riskBand(risk);

  const balMetrics = data.metrics.balanced;

  return (
    <div className="hud-layer">
      {/* Top Bar: Brand & Mission Identity */}
      <div className="hud-top-bar">
        <div className="hud-brand">
          <span className="hud-brand-logo">🧊</span>
          <div>
            <div className="hud-brand-title">CryoNav</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
              MoES · NCPOR · PS 26059
            </div>
          </div>
          <span className="hud-brand-tag">SYSTEM ONLINE</span>
        </div>

        {/* Real-Time Telemetry Panel */}
        <div className="hud-telemetry-panel">
          <div className="hud-metric">
            <span className="hud-metric-label">Mission Clock</span>
            <span className="hud-metric-value" style={{ color: '#0284c7' }}>{timeStr}</span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Coordinates</span>
            <span className="hud-metric-value">{latStr} · {lonStr}</span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">ANRI Risk</span>
            <span className={`hud-metric-value ${band.cls}`}>
              {risk} / 100 [{band.label}]
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Sea Ice</span>
            <span className="hud-metric-value">{Math.round(state.seaIce * 100)}%</span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Wind</span>
            <span className="hud-metric-value">{state.wind.toFixed(0)} m/s</span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Visibility</span>
            <span className="hud-metric-value">{state.visibility.toFixed(1)} km</span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Berg Range</span>
            <span className="hud-metric-value" style={{ color: state.distanceKm < 15 ? '#dc2626' : '#0f172a' }}>
              {state.distanceKm.toFixed(1)} km
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Route Status</span>
            <span className={`hud-metric-value ${band.cls}`}>
              {state.routeStatus}
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">Tracking</span>
            <span className="hud-metric-value" style={{ color: '#64748b' }}>
              {data.berg.id} ({(data.berg.lengthM / 1000).toFixed(1)}×{(data.berg.widthM / 1000).toFixed(1)}km)
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-metric-label">A* Fuel / Dist</span>
            <span className="hud-metric-value" style={{ color: '#059669' }}>
              {balMetrics.fuel_t} MT · {balMetrics.distance_nm} nm
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Mission Progress Scrubber */}
      <div className="hud-bottom-bar">
        <span className="hud-progress-text">MISSION PROGRESS</span>
        <div className="hud-progress-track">
          <div className="hud-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <span className="hud-progress-text">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
