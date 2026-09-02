/* SECTION 07 — RISK INTELLIGENCE
   The ANRI composite. The gauge and factor bars animate in on reveal; the
   score is presented explicitly as a composed value, not a black-box number. */
import React from 'react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';
import { useInView } from '@hooks/useInView';
import { getRiskColor, getRiskLevel } from '@utils/colorScales';

const FACTORS = [
  { key: 'seaIce', label: 'Sea Ice', value: 58, color: '#2563eb' },
  { key: 'iceberg', label: 'Iceberg', value: 41, color: '#0b7fa8' },
  { key: 'wind', label: 'Wind', value: 47, color: '#b45309' },
  { key: 'waves', label: 'Waves', value: 34, color: '#0e8f83' },
  { key: 'visibility', label: 'Visibility', value: 22, color: '#6d28d9' },
  { key: 'ocean', label: 'Ocean', value: 29, color: '#1d4ed8' },
  { key: 'vessel', label: 'Vessel Limits', value: 18, color: '#5c6a87' },
];

const SCORE = 44; // illustrative composite

function Gauge({ score, active }) {
  const R = 84;
  const C = 2 * Math.PI * R;
  const level = getRiskLevel(score);
  const color = getRiskColor(score);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 260, margin: '0 auto' }}>
      <svg viewBox="0 0 200 200" className="lp-svg" role="img" aria-label={`Composite risk index ${score} of 100, ${level.label}`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(13,27,42,0.12)" strokeWidth="10" />
        <circle
          cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={active ? C - (score / 100) * C : C}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1600ms cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text x="100" y="96" textAnchor="middle" fill={color}
          fontSize="42" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
          {active ? score : 0}
        </text>
        <text x="100" y="120" textAnchor="middle" fill="#47596f"
          fontSize="10" fontFamily="monospace" letterSpacing="2">
          {level.label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export default function Risk() {
  const [ref, inView] = useInView({ threshold: 0.3 });

  return (
    <SectionShell num="07" label="Risk Intelligence">
      <div className="lp-stack-lg" style={{ marginBottom: 'var(--space-10)' }}>
        <SectionReveal from="up">
          <h2 className="lp-display">
            Don&apos;t just find a route.<br />
            <span className="lp-gradient-text">Understand the risk.</span>
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            The Antarctic Navigation Risk Index compresses the environmental state
            along a route into a single comparable score — but never hides what it
            is made of. Every contribution stays visible and attributable.
          </p>
        </SectionReveal>
      </div>

      <div ref={ref} className="lp-split">
        <SectionReveal from="scale">
          <div className="lp-panel lp-framed">
            <div className="lp-panel-head">
              <span className="lp-mono lp-dim">ANRI Composite</span>
              <span className="lp-badge-sim">Illustrative</span>
            </div>
            <Gauge score={SCORE} active={inView} />
            <p className="lp-mono lp-dim" style={{ textAlign: 'center', marginTop: 'var(--space-4)', letterSpacing: '0.1em' }}>
              0 = Unrestricted · 100 = No-Go
            </p>
          </div>
        </SectionReveal>

        <SectionReveal from="right" delay={120}>
          <div className="lp-panel">
            <div className="lp-panel-head">
              <span className="lp-mono lp-dim">Contributing Factors</span>
              <span className="lp-mono lp-accent">7 Inputs</span>
            </div>
            <div className="lp-risk-bars">
              {FACTORS.map((f, i) => (
                <div key={f.key} className="lp-risk-row">
                  <span className="lp-risk-name">{f.label}</span>
                  <span className="lp-risk-track">
                    <span
                      className="lp-risk-fill"
                      style={{
                        background: f.color,
                        transform: `scaleX(${inView ? f.value / 100 : 0})`,
                        transitionDelay: `${i * 90}ms`,
                      }}
                    />
                  </span>
                  <span className="lp-risk-num" style={{ color: f.color }}>{f.value}</span>
                </div>
              ))}
            </div>
            <p className="lp-lede" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-5)' }}>
              Ice-class risk indexing follows POLARIS-style banding, where
              concentration bands map to a risk value for the vessel&apos;s class.
              The remaining factors are weighted alongside it.
            </p>
          </div>
        </SectionReveal>
      </div>
    </SectionShell>
  );
}
