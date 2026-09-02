/* SECTION 11 — AI DECISION ENGINE
   Explainability. Every downgrade carries its reasons and the evidence
   behind them — the opposite of a black-box score. */
import React from 'react';
import { TriangleAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const REASONS = [
  { text: 'Iceberg drift envelope intersects the corridor near the mid-passage waypoint', weight: 'Primary' },
  { text: 'Sea-ice concentration along the northern leg trending upward through the horizon', weight: 'High' },
  { text: 'Wind forcing increasing across the exposed sector', weight: 'Moderate' },
  { text: 'Sea state deteriorating beyond comfortable working limits', weight: 'Moderate' },
];

export default function DecisionEngine() {
  return (
    <SectionShell num="11" label="AI Decision Engine">
      <div className="lp-stack-lg" style={{ marginBottom: 'var(--space-10)' }}>
        <SectionReveal from="up">
          <h2 className="lp-display">
            AI that <span className="lp-gradient-text">explains</span><br />its decisions
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            A master will not accept &quot;the model says so.&quot; Every recommendation
            CryoNav issues carries the reasoning, the contributing factors, and the
            alternative it is recommending against — so the decision stays with
            the human who is accountable for it.
          </p>
        </SectionReveal>
      </div>

      <div className="lp-split">
        <SectionReveal from="left">
          <div className="lp-alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <TriangleAlert size={18} style={{ color: 'var(--lp-alert)' }} />
              <span className="lp-mono" style={{ color: 'var(--lp-alert)', letterSpacing: '0.16em' }}>
                Route Warning
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              Route A has been downgraded
            </div>
            <ul className="lp-reason-list">
              {REASONS.map((r) => (
                <li key={r.text} className="lp-reason">
                  <span className="lp-reason-bullet">•</span>
                  <span>
                    {r.text}
                    <span className="lp-mono lp-dim" style={{ display: 'block', marginTop: 2 }}>
                      Contribution: {r.weight}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </SectionReveal>

        <SectionReveal from="right" delay={140}>
          <div className="lp-alert lp-alert-safe">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <ShieldCheck size={18} style={{ color: 'var(--lp-safe)' }} />
              <span className="lp-mono" style={{ color: 'var(--lp-safe)', letterSpacing: '0.16em' }}>
                Recommendation
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              Switch to Route B <ArrowRight size={16} style={{ color: 'var(--lp-safe)' }} />
            </div>
            <p className="lp-lede" style={{ fontSize: 'var(--font-size-md)', marginTop: 'var(--space-3)' }}>
              Route B clears the projected drift envelope with margin, at the cost
              of additional transit time and fuel. The trade is stated explicitly
              rather than absorbed silently into a score.
            </p>

            <div className="lp-chat-facts">
              <div className="lp-chat-fact">
                <div className="lp-metric-value" style={{ fontSize: '1.15rem', color: 'var(--lp-frost)' }}>+34 nm</div>
                <div className="lp-metric-label">Added Distance</div>
              </div>
              <div className="lp-chat-fact">
                <div className="lp-metric-value" style={{ fontSize: '1.15rem', color: 'var(--lp-frost)' }}>+5.2 h</div>
                <div className="lp-metric-label">Added Time</div>
              </div>
              <div className="lp-chat-fact">
                <div className="lp-metric-value" style={{ fontSize: '1.15rem', color: 'var(--lp-safe)' }}>−28</div>
                <div className="lp-metric-label">Risk Delta</div>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <span className="lp-badge-sim">Illustrative Recommendation</span>
            </div>
          </div>
        </SectionReveal>
      </div>
    </SectionShell>
  );
}
