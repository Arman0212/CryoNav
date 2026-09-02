/* SECTION 05 — ICEBERG INTELLIGENCE
   Detection → tracking → trajectory → uncertainty → intersection.
   The trajectory visual mirrors the repository's actual approach: a
   momentum-balance drift model integrated forward, run as a perturbed
   ensemble so the spread itself is the uncertainty estimate. */
import React from 'react';
import { Radar, Route, Spline, CircleDot, TriangleAlert } from 'lucide-react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const STAGES = [
  { icon: Radar, name: 'Detection', desc: 'Bergs identified from scatterometer-based tracking records' },
  { icon: CircleDot, name: 'Tracking', desc: 'Position, dimensions, and drift history maintained per berg' },
  { icon: Spline, name: 'Trajectory', desc: 'Momentum balance integrated forward over the forecast horizon' },
  { icon: Route, name: 'Uncertainty', desc: 'Perturbed ensemble members bound the plausible drift envelope' },
  { icon: TriangleAlert, name: 'Intersection', desc: 'Envelope tested against the planned route in space and time' },
];

function TrajectoryVisual() {
  return (
    <svg className="lp-svg" viewBox="0 0 640 320" role="img"
      aria-label="Predicted iceberg drift track with a widening uncertainty envelope crossing a planned route">
      <defs>
        <linearGradient id="lp-cone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0b7fa8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0b7fa8" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2="320" stroke="rgba(13,27,42,0.08)" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 80} x2="640" y2={i * 80} stroke="rgba(13,27,42,0.08)" />
      ))}

      {/* Uncertainty envelope — widens with lead time */}
      <path d="M70 210 C 210 190, 340 150, 560 66 L 560 128 C 350 208, 220 236, 76 240 Z"
        fill="url(#lp-cone)" />

      {/* Ensemble members */}
      {[-16, -8, 8, 16].map((dy, i) => (
        <path key={i}
          d={`M72 ${216 + dy * 0.2} C 210 ${196 + dy * 0.6}, 340 ${158 + dy}, 558 ${98 + dy * 1.5}`}
          fill="none" stroke="rgba(11,127,168,0.34)" strokeWidth="1" />
      ))}

      {/* Mean predicted track */}
      <path className="lp-draw" style={{ '--len': 560 }}
        d="M72 216 C 210 196, 340 158, 558 98"
        fill="none" stroke="#0b7fa8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Planned vessel route, crossing the envelope */}
      <path className="lp-draw" style={{ '--len': 620, transitionDelay: '400ms' }}
        d="M40 60 C 200 110, 380 190, 610 250"
        fill="none" stroke="#1668c9" strokeWidth="2.5" strokeDasharray="0" strokeLinecap="round" />

      {/* Conflict marker at the crossing */}
      <g transform="translate(354 160)">
        <circle r="15" fill="none" stroke="#c2570b" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle r="4.5" fill="#c2570b" />
      </g>
      <text x="376" y="152" fill="#c2570b" fontSize="10" fontFamily="monospace">INTERSECTION</text>

      {/* Berg at origin */}
      <polygon points="72,206 84,214 79,226 65,225 60,214" fill="#dbeafe" stroke="rgba(13,27,42,0.25)" />
      <text x="46" y="252" fill="#47596f" fontSize="10" fontFamily="monospace">T0</text>
      <text x="536" y="86" fill="#47596f" fontSize="10" fontFamily="monospace">T+7D</text>
    </svg>
  );
}

export default function Icebergs() {
  return (
    <SectionShell num="05" label="Iceberg Intelligence">
      <div className="lp-split">
        <div className="lp-stack-lg">
          <SectionReveal from="up">
            <h2 className="lp-display-sm">
              An iceberg isn&apos;t<br />
              <span className="lp-gradient-text">just an object</span>
            </h2>
          </SectionReveal>
          <SectionReveal from="up" delay={100}>
            <p className="lp-lede">
              It is a mass with momentum, driven by wind, current, and Coriolis
              force, and partly locked to the pack around it. Where it will be in
              seven days matters far more than where it is now.
            </p>
          </SectionReveal>
          <SectionReveal from="up" delay={160}>
            <p className="lp-lede">
              CryoNav integrates each berg forward as an ensemble. The spread
              between members is the honest uncertainty — a single predicted line
              would imply a confidence the physics does not support.
            </p>
          </SectionReveal>
          <SectionReveal from="fade" delay={220}>
            <span className="lp-badge-sim">Illustrative Trajectory</span>
          </SectionReveal>
        </div>

        <SectionReveal from="scale" delay={140}>
          <div className="lp-panel lp-framed">
            <div className="lp-panel-head">
              <span className="lp-mono lp-dim">Drift Ensemble</span>
              <span className="lp-mono lp-accent">Momentum Balance</span>
            </div>
            <TrajectoryVisual />
          </div>
        </SectionReveal>
      </div>

      <div className="lp-forces" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px,100%),1fr))' }}>
        {STAGES.map((stage, i) => (
          <SectionReveal key={stage.name} from="up" delay={i * 70} className="lp-force">
            <stage.icon size={18} className="lp-force-icon" />
            <div className="lp-force-name">{stage.name}</div>
            <div className="lp-force-desc">{stage.desc}</div>
          </SectionReveal>
        ))}
      </div>
    </SectionShell>
  );
}
