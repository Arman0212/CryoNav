/* SECTION 06 — THE VESSEL
   Sticky stage: a vessel travels its route while environmental layers
   accumulate around it, then the route resolves from exposed to optimised.
   Vessel parameters shown are the real ones from config/domain.yaml. */
import React from 'react';
import { useAutoSequence } from '@hooks/useAutoSequence';
import SequenceHint from '@components/landing/SequenceHint';

const LAYERS = [
  { at: 0.12, label: 'Sea Ice', color: '#2563eb' },
  { at: 0.28, label: 'Wind', color: '#b45309' },
  { at: 0.44, label: 'Waves', color: '#0e8f83' },
  { at: 0.58, label: 'Icebergs', color: '#e8edf5' },
  { at: 0.72, label: 'Currents', color: '#6d28d9' },
];

export default function Vessel() {
  const [trackRef, progress, playing] = useAutoSequence({ duration: 4400 });

  // Vessel travels left → right across the middle of the scroll track
  const t = Math.max(0, Math.min(1, (progress - 0.08) / 0.84));
  const optimised = progress > 0.78;

  return (
    <section className="lp-section" style={{ padding: 0 }}>
      <SequenceHint active={playing} progress={progress} label="Transit in progress" />
      <div ref={trackRef} className="lp-track">
        <div className="lp-stage-solo">
          <div className="lp-section-inner lp-stack-lg">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-num">06</span>
              <span className="lp-eyebrow-rule" />
              <span className="lp-eyebrow-text">The Vessel</span>
            </div>

            <h2 className="lp-display-sm">
              Every route<br />is a <span className="lp-gradient-text">decision</span>
            </h2>

            <div className="lp-panel lp-framed">
              <div className="lp-panel-head">
                <span className="lp-mono lp-dim">Polar Class 6 / IA Super · 14.0 kn open water</span>
                <span className="lp-mono" style={{ color: optimised ? 'var(--lp-safe)' : 'var(--lp-alert)' }}>
                  {optimised ? 'Route Optimised' : 'Exposure Accumulating'}
                </span>
              </div>

              <svg className="lp-svg" viewBox="0 0 900 280" role="img"
                aria-label="A vessel crossing the Southern Ocean while environmental layers accumulate around its route">
                {Array.from({ length: 10 }, (_, i) => (
                  <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="280" stroke="rgba(13,27,42,0.08)" />
                ))}

                {/* Exposed route (fades as the optimised one takes over) */}
                <path d="M60 200 C 260 190, 420 170, 840 96"
                  fill="none" stroke="#c2570b" strokeWidth="2" strokeDasharray="6 6"
                  opacity={optimised ? 0.25 : 0.8}
                  style={{ transition: 'opacity 700ms ease-out' }} />

                {/* Optimised route */}
                <path d="M60 200 C 280 236, 470 210, 840 96"
                  fill="none" stroke="#0b7fa8" strokeWidth="2.5" strokeLinecap="round"
                  opacity={optimised ? 1 : 0.12}
                  style={{ transition: 'opacity 700ms ease-out' }} />

                {/* Environmental layers appearing in sequence */}
                {LAYERS.map((layer, i) => {
                  const shown = progress > layer.at;
                  const x = 150 + i * 145;
                  return (
                    <g key={layer.label} opacity={shown ? 1 : 0}
                      style={{ transition: 'opacity 600ms ease-out' }}>
                      <circle cx={x} cy={70 + (i % 2) * 130} r="26"
                        fill="none" stroke={layer.color} strokeOpacity="0.28" strokeDasharray="3 5" />
                      <circle cx={x} cy={70 + (i % 2) * 130} r="3" fill={layer.color} />
                      <text x={x + 34} y={74 + (i % 2) * 130} fill={layer.color}
                        fontSize="10" fontFamily="monospace" opacity="0.85">
                        {layer.label.toUpperCase()}
                      </text>
                    </g>
                  );
                })}

                {/* Vessel — position interpolated along the active corridor */}
                <g transform={`translate(${60 + t * 780} ${optimised ? 200 - t * 104 + Math.sin(t * Math.PI) * 26 : 200 - t * 104})`}>
                  <polygon points="0,-7 13,0 0,7 -4,0" fill="#0b7fa8" />
                  <circle r="17" fill="none" stroke="#0b7fa8" strokeOpacity="0.35" />
                </g>
              </svg>

              <div className="lp-telemetry" style={{ marginTop: 'var(--space-4)' }}>
                <span className="lp-telemetry-item">
                  <span className={`lp-status-dot ${optimised ? '' : 'is-warn'}`} />
                  {optimised ? 'Corridor accepted' : 'Evaluating corridor'}
                </span>
                <span className="lp-telemetry-item">Transit {String(Math.round(t * 100)).padStart(3, '0')}%</span>
                <span className="lp-badge-sim">Simulated Transit</span>
              </div>
            </div>

            <p className="lp-lede">
              The vessel does not move through an empty ocean. Each layer that
              appears is another constraint the route has to answer for — and the
              corridor that satisfies all of them is rarely the one that looks
              shortest on a chart.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
