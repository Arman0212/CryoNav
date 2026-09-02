/* SECTION 08 — ROUTE OPTIMIZATION
   The four alternative profiles the routing engine actually generates
   (config/routing.yaml: great_circle, min_ice, min_time, balanced) drawn
   together, with the balanced profile resolving as recommended.

   All figures are illustrative and labelled as such — the real numbers come
   from the live engine inside the app. */
import React from 'react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';
import { useInView } from '@hooks/useInView';

const ROUTES = [
  {
    key: 'great_circle', label: 'Great Circle', tag: 'Shortest', color: '#6d28d9',
    d: 'M60 250 C 240 214, 460 150, 860 82',
    distance: '2,744 nm', eta: '196 h', fuel: '207 t', risk: 'Unassessed', optimal: false,
  },
  {
    key: 'min_ice', label: 'Minimum Ice', tag: 'Safest', color: '#0f7a53',
    d: 'M60 250 C 260 300, 520 258, 860 82',
    distance: '3,148 nm', eta: '241 h', fuel: '276 t', risk: 'Lowest', optimal: false,
  },
  {
    key: 'min_time', label: 'Minimum Time', tag: 'Fastest', color: '#b45309',
    d: 'M60 250 C 250 226, 470 176, 860 82',
    distance: '2,773 nm', eta: '211 h', fuel: '247 t', risk: 'Elevated', optimal: false,
  },
  {
    key: 'balanced', label: 'Balanced', tag: 'AI Optimized', color: '#0b7fa8',
    d: 'M60 250 C 255 250, 480 196, 860 82',
    distance: '2,779 nm', eta: '211 h', fuel: '247 t', risk: 'Managed', optimal: true,
  },
];

export default function Routing() {
  const [ref, inView] = useInView({ threshold: 0.25 });

  return (
    <SectionShell id="routing" num="08" label="Route Optimization">
      <div className="lp-stack-lg" style={{ marginBottom: 'var(--space-10)' }}>
        <SectionReveal from="up">
          <h2 className="lp-display">
            The shortest route<br />
            isn&apos;t always<br />
            <span className="lp-gradient-text">the best route</span>
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            A time-expanded A* search runs across the forecast field, costing each
            cell by transit difficulty, fuel burn, and safety risk. Change the
            weights and you get a genuinely different corridor — so CryoNav
            computes several and shows you the trade.
          </p>
        </SectionReveal>
      </div>

      <SectionReveal from="scale">
        <div ref={ref} className="lp-panel lp-framed">
          <div className="lp-panel-head">
            <span className="lp-mono lp-dim">Alternative Corridors</span>
            <span className="lp-badge-sim">Illustrative Values</span>
          </div>

          <svg className="lp-svg" viewBox="0 0 920 320" role="img"
            aria-label="Four alternative route corridors between departure and station, with the balanced route highlighted">
            {Array.from({ length: 10 }, (_, i) => (
              <line key={`v${i}`} x1={i * 102} y1="0" x2={i * 102} y2="320" stroke="rgba(13,27,42,0.08)" />
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 106} x2="920" y2={i * 106} stroke="rgba(13,27,42,0.08)" />
            ))}

            {/* Ice field hint along the southern approach */}
            <path d="M0 150 C 200 128, 460 104, 920 66 L 920 0 L 0 0 Z" fill="rgba(37,99,235,0.08)" />
            <path d="M0 150 C 200 128, 460 104, 920 66" fill="none"
              stroke="rgba(11,127,168,0.22)" strokeWidth="1.5" strokeDasharray="5 8" />

            {ROUTES.map((r, i) => (
              <path
                key={r.key}
                className="lp-draw"
                style={{ '--len': 1000, transitionDelay: `${i * 240}ms` }}
                d={r.d}
                fill="none"
                stroke={r.color}
                strokeWidth={r.optimal ? 3.5 : 1.8}
                strokeOpacity={r.optimal ? 1 : 0.5}
                strokeLinecap="round"
                strokeDashoffset={inView ? 0 : 1000}
                strokeDasharray={1000}
              />
            ))}

            {/* Endpoints */}
            <g>
              <circle cx="60" cy="250" r="6" fill="#dbeafe" stroke="rgba(13,27,42,0.25)" />
              <text x="34" y="278" fill="#47596f" fontSize="10" fontFamily="monospace">DEPARTURE</text>
              <rect x="854" y="76" width="10" height="10" fill="#6d28d9" />
              <text x="796" y="66" fill="#47596f" fontSize="10" fontFamily="monospace">STATION</text>
            </g>
          </svg>

          <div style={{ overflowX: 'auto' }}>
            <table className="lp-routes">
              <thead>
                <tr>
                  <th>Profile</th><th>Objective</th><th>Distance</th>
                  <th>ETA</th><th>Fuel</th><th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map((r) => (
                  <tr key={r.key} className={r.optimal ? 'is-optimal' : ''}>
                    <td>
                      <span className="lp-route-swatch" style={{ background: r.color }} />
                      {r.label}
                    </td>
                    <td>{r.tag}</td>
                    <td>{r.distance}</td>
                    <td>{r.eta}</td>
                    <td>{r.fuel}</td>
                    <td style={{ color: r.optimal ? 'var(--lp-cyan)' : undefined }}>{r.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="lp-mono lp-dim" style={{ marginTop: 'var(--space-4)', letterSpacing: '0.1em', lineHeight: 1.7 }}>
            The minimum-ice corridor buys safety with roughly 400 nm and 45 hours.
            The balanced profile gives most of that safety back for a fraction of the cost.
          </p>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
