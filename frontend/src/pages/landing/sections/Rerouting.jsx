/* SECTION 09 — DYNAMIC RE-ROUTING
   The cinematic set piece. A sticky stage steps through: new data arrives →
   berg detected → trajectory predicted → route invalidated → replan → new
   corridor. Driven entirely by scroll position. */
import React from 'react';
import { useAutoSequence } from '@hooks/useAutoSequence';
import SequenceHint from '@components/landing/SequenceHint';

const PHASES = [
  { at: 0.00, label: 'Nominal', note: 'Vessel following the accepted corridor', tone: 'ok' },
  { at: 0.18, label: 'New Satellite Data', note: 'Fresh observation ingested for the sector', tone: 'ok' },
  { at: 0.36, label: 'Iceberg Detected', note: 'Previously untracked mass identified ahead', tone: 'warn' },
  { at: 0.52, label: 'Trajectory Predicted', note: 'Drift ensemble projected across the horizon', tone: 'warn' },
  { at: 0.68, label: 'Route Unsafe', note: 'Envelope intersects the planned corridor', tone: 'danger' },
  { at: 0.82, label: 'Replanning', note: 'A* re-run against the updated risk field', tone: 'warn' },
  { at: 0.93, label: 'New Route Accepted', note: 'Safe corridor issued to the bridge', tone: 'ok' },
];

const TONE_COLOR = { ok: 'var(--lp-safe)', warn: 'var(--lp-alert)', danger: 'var(--lp-danger)' };

export default function Rerouting() {
  const [trackRef, progress, playing] = useAutoSequence({ duration: 5200 });

  let phaseIndex = 0;
  PHASES.forEach((p, i) => { if (progress >= p.at) phaseIndex = i; });
  const phase = PHASES[phaseIndex];

  const showBerg = progress >= 0.36;
  const showCone = progress >= 0.52;
  const routeCompromised = progress >= 0.68;
  const showNewRoute = progress >= 0.82;

  return (
    <section className="lp-section" style={{ padding: 0 }}>
      <SequenceHint active={playing} progress={progress} label="Re-routing sequence" />
      <div ref={trackRef} className="lp-track">
        <div className="lp-stage-solo">
          <div className="lp-section-inner lp-stack-lg">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-num">09</span>
              <span className="lp-eyebrow-rule" />
              <span className="lp-eyebrow-text">Dynamic Re-Routing</span>
            </div>

            <h2 className="lp-display-sm">
              When the environment changes,<br />
              <span className="lp-gradient-text">the route changes with it.</span>
            </h2>

            <div className="lp-panel lp-framed">
              <div className="lp-panel-head">
                <span className="lp-telemetry-item lp-mono">
                  <span className="lp-status-dot" style={{ background: TONE_COLOR[phase.tone] }} />
                  <span style={{ color: TONE_COLOR[phase.tone] }}>{phase.label}</span>
                </span>
                <span className="lp-mono lp-dim">
                  {String(phaseIndex + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
                </span>
              </div>

              <svg className="lp-svg" viewBox="0 0 900 300" role="img" aria-label={`Re-routing sequence: ${phase.label}`}>
                {Array.from({ length: 10 }, (_, i) => (
                  <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="300" stroke="rgba(13,27,42,0.08)" />
                ))}

                {/* Original corridor — turns to warning then dashed-out */}
                <path
                  d="M60 230 C 260 208, 480 160, 850 92"
                  fill="none"
                  stroke={routeCompromised ? '#c62828' : '#0b7fa8'}
                  strokeWidth={showNewRoute ? 1.6 : 2.8}
                  strokeDasharray={routeCompromised ? '7 7' : '0'}
                  strokeOpacity={showNewRoute ? 0.45 : 1}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 600ms ease-out, stroke-opacity 600ms ease-out, stroke-width 600ms ease-out' }}
                />

                {/* Replanned corridor */}
                <path
                  d="M60 230 C 300 274, 540 236, 850 92"
                  fill="none" stroke="#0f7a53" strokeWidth="3" strokeLinecap="round"
                  opacity={showNewRoute ? 1 : 0}
                  style={{ transition: 'opacity 700ms ease-out' }}
                />

                {/* Iceberg + drift envelope */}
                <g opacity={showBerg ? 1 : 0} style={{ transition: 'opacity 600ms ease-out' }}>
                  <polygon points="452,178 466,188 460,202 442,200 436,186" fill="#dbeafe" stroke="rgba(13,27,42,0.25)" />
                  <text x="410" y="226" fill="#47596f" fontSize="10" fontFamily="monospace">BERG</text>
                </g>
                <g opacity={showCone ? 1 : 0} style={{ transition: 'opacity 700ms ease-out' }}>
                  <path d="M452 186 C 500 172, 540 156, 596 132 L 604 166 C 546 190, 502 206, 456 208 Z"
                    fill="rgba(194,87,11,0.2)" stroke="rgba(194,87,11,0.45)" />
                  <path d="M452 186 C 500 172, 540 156, 600 148" fill="none"
                    stroke="#c2570b" strokeWidth="2" strokeDasharray="4 4" />
                </g>

                {/* Conflict marker */}
                <g opacity={routeCompromised ? 1 : 0} style={{ transition: 'opacity 500ms ease-out' }}>
                  <circle cx="566" cy="146" r="18" fill="none" stroke="#c62828" strokeWidth="1.5" />
                  <line x1="558" y1="138" x2="574" y2="154" stroke="#c62828" strokeWidth="2" />
                  <line x1="574" y1="138" x2="558" y2="154" stroke="#c62828" strokeWidth="2" />
                </g>

                {/* Vessel holds station at the decision point */}
                <g transform={`translate(${60 + Math.min(progress, 0.62) * 480} ${230 - Math.min(progress, 0.62) * 92})`}>
                  <polygon points="0,-7 13,0 0,7 -4,0" fill="#0b7fa8" />
                </g>
              </svg>

              <div className="lp-telemetry" style={{ marginTop: 'var(--space-4)' }}>
                <span className="lp-telemetry-item" style={{ color: 'var(--lp-steel)' }}>{phase.note}</span>
                <span className="lp-badge-sim">Simulated Scenario</span>
              </div>
            </div>

            <p className="lp-lede">
              This is the capability that separates a route planner from a decision
              support system: the plan is not a document produced once at departure,
              it is a position that gets re-argued every time the ocean says
              something new.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
