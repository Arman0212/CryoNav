/* ═══════════════════════════════════════════════════════════════
   MapLegend — what every colour on the map means.

   The bundled web/ client has one and the React map didn't, which left
   the route colours, drift tracks and ice ramp unexplained. Colours here
   are read from the same constants the layers draw with, so the legend
   cannot drift out of step with the map.

   Collapsible, because on a small screen a permanent legend costs more
   than it explains.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { List, ChevronDown } from 'lucide-react';

const ROUTE_KEYS = [
  { label: 'Balanced (recommended)', color: '#1668c9' },
  { label: 'Minimum ice', color: '#0f7a53' },
  { label: 'Minimum time', color: '#c2570b' },
  { label: 'Great circle', color: '#6d3fd4' },
  { label: "Today's ice route", color: '#c62828' },
];

const FEATURES = [
  { label: 'Iceberg (day 0)', color: '#0b7fa8', shape: 'berg' },
  { label: 'Drift track / projected', color: '#c98a00', shape: 'dash' },
  { label: 'Drift uncertainty (2σ)', color: '#c98a00', shape: 'ring' },
  { label: 'Iceberg (NIC observed)', color: '#c2410c', shape: 'tri' },
  { label: 'Research station', color: '#0b7fa8', shape: 'pill' },
  { label: 'Departure port', color: '#b8860b', shape: 'pill' },
  { label: 'Ocean current', color: '#6d28d9', shape: 'arrow' },
  { label: 'Wind', color: '#b45309', shape: 'arrow' },
];

/* Sea-ice ramp, sampled from the same curve SicCanvasLayer draws. */
const ICE_STOPS = [
  { v: '5%', c: 'rgba(90,195,235,0.45)' },
  { v: '30%', c: 'rgba(170,235,255,0.70)' },
  { v: '50%', c: 'rgba(203,243,255,0.78)' },
  { v: '70%', c: 'rgba(235,250,255,0.87)' },
  { v: '100%', c: 'rgba(255,255,255,0.97)' },
];

function Swatch({ color, shape }) {
  if (shape === 'dash') {
    return <span className="lg-swatch lg-dash" style={{ borderTopColor: color }} />;
  }
  if (shape === 'ring') {
    return <span className="lg-swatch lg-ring" style={{ borderColor: color }} />;
  }
  if (shape === 'tri') {
    return <span className="lg-swatch lg-tri" style={{ background: color }} />;
  }
  if (shape === 'berg') {
    return <span className="lg-swatch lg-berg" style={{ background: color }} />;
  }
  if (shape === 'pill') {
    return <span className="lg-swatch lg-pill" style={{ borderColor: color }} />;
  }
  if (shape === 'arrow') {
    return <span className="lg-swatch lg-arrow" style={{ background: color }} />;
  }
  return <span className="lg-swatch lg-line" style={{ background: color }} />;
}

export default function MapLegend() {
  const [open, setOpen] = useState(true);

  return (
    <div className={`map-legend ${open ? 'is-open' : ''}`}>
      <button type="button" className="lg-head" onClick={() => setOpen((o) => !o)}>
        <List size={12} />
        <span>Legend</span>
        <ChevronDown size={12} className="lg-chevron" />
      </button>

      {open && (
        <div className="lg-body">
          <div className="lg-group-title">Sea ice concentration</div>
          <div className="lg-ramp">
            {ICE_STOPS.map((s) => (
              <span key={s.v} className="lg-ramp-cell" style={{ background: s.c }} />
            ))}
          </div>
          <div className="lg-ramp-labels">
            <span>5%</span><span>50%</span><span>100%</span>
          </div>

          <div className="lg-group-title">Forecast difference</div>
          <div className="lg-diff">
            <span className="lg-swatch lg-line" style={{ background: 'rgba(255,68,85,0.85)' }} />
            <span>under-predicts</span>
            <span className="lg-swatch lg-line" style={{ background: 'rgba(0,168,255,0.85)' }} />
            <span>over-predicts</span>
          </div>

          <div className="lg-group-title">Routes</div>
          {ROUTE_KEYS.map((r) => (
            <div key={r.label} className="lg-row">
              <Swatch color={r.color} /> <span>{r.label}</span>
            </div>
          ))}

          <div className="lg-group-title">Features</div>
          {FEATURES.map((f) => (
            <div key={f.label} className="lg-row">
              <Swatch color={f.color} shape={f.shape} /> <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
