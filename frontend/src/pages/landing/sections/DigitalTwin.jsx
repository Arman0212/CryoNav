/* SECTION 10 — DIGITAL TWIN
   A living model of the domain, scrubbed across PAST → NOW → FUTURE.
   The scrubber is interactive (and also advances with scroll reveal). */
import React, { useState } from 'react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const FRAMES = [
  { key: 'past', label: 'Past', sub: 'T − 7 D', ice: 0.34, bergs: 3, note: 'Observed state from the data cube' },
  { key: 'now', label: 'Now', sub: 'T 0', ice: 0.52, bergs: 5, note: 'Current analysis — the operational picture' },
  { key: 'future', label: 'Future', sub: 'T + 7 D', ice: 0.71, bergs: 5, note: 'Forecast state driving the routing decision' },
];

const LAYERS = ['Sea Ice', 'Icebergs', 'Ocean Currents', 'Wind', 'Vessel', 'Routes', 'Stations'];

export default function DigitalTwin() {
  const [frame, setFrame] = useState(1);
  const f = FRAMES[frame];

  return (
    <SectionShell num="10" label="Digital Twin">
      <div className="lp-stack-lg" style={{ marginBottom: 'var(--space-10)' }}>
        <SectionReveal from="up">
          <h2 className="lp-display">
            A living model<br />of <span className="lp-gradient-text">Antarctica</span>
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            Every layer shares one grid, one clock, and one coordinate system —
            an analysis-ready cube spanning the domain. That shared frame is what
            makes it possible to ask questions across ice, ocean, weather, and
            vessel simultaneously.
          </p>
        </SectionReveal>
      </div>

      <SectionReveal from="scale">
        <div className="lp-panel lp-framed">
          <div className="lp-panel-head">
            <span className="lp-mono lp-dim">Domain State · {f.sub}</span>
            <span className="lp-badge-sim">Illustrative</span>
          </div>

          <svg className="lp-svg" viewBox="0 0 900 280" role="img"
            aria-label={`Digital twin of the domain at ${f.label}`}>
            {Array.from({ length: 10 }, (_, i) => (
              <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="280" stroke="rgba(13,27,42,0.08)" />
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 93} x2="900" y2={i * 93} stroke="rgba(13,27,42,0.08)" />
            ))}

            {/* Ice extent — grows with the frame */}
            <rect x="0" y="0" width="900" height={280 * f.ice}
              fill="rgba(37,99,235,0.14)" style={{ transition: 'height 800ms ease-out' }} />
            <line x1="0" y1={280 * f.ice} x2="900" y2={280 * f.ice}
              stroke="#0b7fa8" strokeWidth="1.5" strokeDasharray="6 8"
              style={{ transition: 'y1 800ms ease-out, y2 800ms ease-out' }} />

            {/* Current vectors */}
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i} opacity="0.5">
                <line x1={70 + i * 125} y1={220} x2={110 + i * 125} y2={212}
                  stroke="#6d28d9" strokeWidth="1.5" />
                <polygon points={`${110 + i * 125},${212} ${103 + i * 125},${209} ${104 + i * 125},${216}`} fill="#6d28d9" />
              </g>
            ))}

            {/* Bergs */}
            {Array.from({ length: f.bergs }, (_, i) => {
              const x = 130 + i * 160;
              const y = 70 + (i % 3) * 34 + frame * 10;
              return (
                <polygon key={i}
                  points={`${x},${y - 6} ${x + 8},${y + 1} ${x + 3},${y + 8} ${x - 6},${y + 6} ${x - 8},${y}`}
                  fill="#dbeafe" stroke="rgba(13,27,42,0.25)"
                  style={{ transition: 'all 800ms ease-out' }} />
              );
            })}

            {/* Route + vessel */}
            <path d="M50 250 C 300 240, 560 190, 860 120" fill="none"
              stroke="#0b7fa8" strokeWidth="2" strokeOpacity="0.75" />
            <g transform={`translate(${180 + frame * 240} ${244 - frame * 34})`}>
              <polygon points="0,-6 11,0 0,6 -3,0" fill="#0b7fa8" />
            </g>

            {/* Stations */}
            <rect x="852" y="114" width="9" height="9" fill="#6d28d9" />
            <rect x="120" y="196" width="9" height="9" fill="#6d28d9" />
          </svg>

          {/* Timeline scrubber */}
          <div className="lp-timeline-steps" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {FRAMES.map((fr, i) => (
              <button
                key={fr.key}
                type="button"
                className={`lp-timeline-step ${i === frame ? 'is-active' : ''}`}
                onClick={() => setFrame(i)}
                style={{ cursor: 'pointer', background: i === frame ? 'rgba(11,127,168,0.07)' : 'transparent' }}
              >
                {fr.label} · {fr.sub}
              </button>
            ))}
          </div>

          <p className="lp-mono lp-dim" style={{ marginTop: 'var(--space-3)', letterSpacing: '0.1em' }}>
            {f.note}
          </p>

          <div className="lp-telemetry" style={{ marginTop: 'var(--space-4)' }}>
            {LAYERS.map((l) => (
              <span key={l} className="lp-telemetry-item"><span className="lp-status-dot" /> {l}</span>
            ))}
          </div>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
