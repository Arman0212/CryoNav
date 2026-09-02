/* MissionHUD — minimal scientific instrumentation over the world.

   Thin glass strips in the corners of the viewport, not dashboard cards.
   Every value updates each frame, so they are written straight to DOM
   nodes through refs — routing them through React state would re-render
   the HUD sixty times a second for nothing.

   LAT/LON are genuine: the vessel's scene position is run back through
   the inverse of the projection used to build the scene, so the readout
   tracks real coordinates along the real corridor. Wind, visibility and
   ANRI are demonstration series and are labelled DEMO. */

import React, { useEffect, useRef } from 'react';
import { useMission } from '../experience/MissionController';

function riskBand(v) {
  if (v <= 33) return { label: 'Low', cls: 'is-safe' };
  if (v <= 55) return { label: 'Moderate', cls: 'is-warn' };
  if (v <= 72) return { label: 'Elevated', cls: 'is-warn' };
  return { label: 'High', cls: 'is-danger' };
}

/** One instrument line. */
function Readout({ label, valueRef, unit, tag }) {
  return (
    <div className="lp3-readout">
      <span className="lp3-readout-label">{label}</span>
      <span className="lp3-readout-value" ref={valueRef}>—</span>
      {unit && <span className="lp3-readout-unit">{unit}</span>}
      {tag && <span className="lp3-sim">{tag}</span>}
    </div>
  );
}

export default function MissionHUD() {
  const { state, data } = useMission();

  const refs = {
    time: useRef(null), lat: useRef(null), lon: useRef(null),
    risk: useRef(null), riskBand: useRef(null), riskBar: useRef(null),
    ice: useRef(null), wind: useRef(null), vis: useRef(null),
    dist: useRef(null), status: useRef(null), rail: useRef(null),
  };

  useEffect(() => {
    let raf = null;
    const paint = () => {
      raf = requestAnimationFrame(paint);
      const s = state.current;
      if (!s) return;

      const h = Math.floor(s.missionTime);
      const m = Math.floor((s.missionTime - h) * 60);
      const sec = Math.floor((((s.missionTime - h) * 60) - m) * 60);
      if (refs.time.current) {
        refs.time.current.textContent =
          `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }

      if (refs.lat.current) refs.lat.current.textContent = `${Math.abs(s.lat).toFixed(3)}° S`;
      if (refs.lon.current) refs.lon.current.textContent = `${Math.abs(s.lon).toFixed(3)}° ${s.lon < 0 ? 'W' : 'E'}`;

      const risk = Math.round(s.risk);
      const band = riskBand(risk);
      if (refs.risk.current) refs.risk.current.textContent = String(risk).padStart(2, '0');
      if (refs.riskBand.current) refs.riskBand.current.textContent = band.label;
      if (refs.riskBar.current) {
        refs.riskBar.current.style.transform = `scaleX(${risk / 100})`;
        refs.riskBar.current.className = `lp3-bar-fill ${band.cls}`;
      }

      if (refs.ice.current) refs.ice.current.textContent = `${Math.round(s.seaIce * 100)}%`;
      if (refs.wind.current) refs.wind.current.textContent = `${s.wind.toFixed(0)} m/s`;
      if (refs.vis.current) refs.vis.current.textContent = `${s.visibility.toFixed(1)} km`;
      if (refs.dist.current) refs.dist.current.textContent = `${s.distanceKm.toFixed(1)} km`;
      if (refs.status.current) {
        refs.status.current.textContent = s.routeStatus;
        refs.status.current.className = `lp3-status ${band.cls}`;
      }
      if (refs.rail.current) refs.rail.current.style.transform = `scaleX(${s.progress})`;
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="lp3-hud">
      {/* Identity */}
      <div className="lp3-hud-tl">
        <div className="lp3-brand">CryoNav</div>
        <div className="lp3-sub">Antarctic Navigation Intelligence</div>
      </div>

      {/* Status + clock */}
      <div className="lp3-hud-tr">
        <div className="lp3-meta"><span className="lp3-dot" /> System online</div>
        <div className="lp3-clock" ref={refs.time}>T+00:00:00</div>
        <div className="lp3-meta">
          <span ref={refs.lat}>—</span> · <span ref={refs.lon}>—</span>
        </div>
        <div className="lp3-meta lp3-tag">MoES · NCPOR · PS 26059</div>
      </div>

      {/* Instruments */}
      <div className="lp3-hud-bl">
        <div className="lp3-readout lp3-readout-lead">
          <span className="lp3-readout-label">ANRI</span>
          <span className="lp3-readout-value lp3-readout-big" ref={refs.risk}>22</span>
          <span className="lp3-readout-unit">/100</span>
          <span className="lp3-readout-band" ref={refs.riskBand}>Low</span>
        </div>
        <div className="lp3-bar"><span className="lp3-bar-fill is-safe" ref={refs.riskBar} /></div>

        <Readout label="Sea ice" valueRef={refs.ice} tag="demo" />
        <Readout label="Wind" valueRef={refs.wind} tag="demo" />
        <Readout label="Visibility" valueRef={refs.vis} tag="demo" />
        <Readout label="Berg range" valueRef={refs.dist} />
        <div className="lp3-readout">
          <span className="lp3-readout-label">Route</span>
          <span className="lp3-status is-safe" ref={refs.status}>Nominal</span>
        </div>
        <div className="lp3-readout">
          <span className="lp3-readout-label">Tracking</span>
          <span className="lp3-readout-value lp3-readout-id">{data.berg.id}</span>
          <span className="lp3-readout-unit">
            {(data.berg.lengthM / 1000).toFixed(1)} × {(data.berg.widthM / 1000).toFixed(1)} km
          </span>
        </div>

        <div className="lp3-scale-note">Visualisation · drift amplified for scale</div>
      </div>

      <div className="lp3-rail"><span className="lp3-rail-fill" ref={refs.rail} /></div>
    </div>
  );
}
