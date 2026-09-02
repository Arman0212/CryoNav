/* SECTION 12 — AI COPILOT
   Natural-language interrogation of the system state. Presented as a
   scripted illustration; the copilot backend is not yet implemented, and
   the section says so rather than implying a live capability. */
import React from 'react';
import { Bot, User } from 'lucide-react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const FACTS = [
  { label: 'ETA', value: '41.5 h' },
  { label: 'Fuel', value: '96 t' },
  { label: 'Risk', value: 'Moderate' },
  { label: 'Confidence', value: 'Medium' },
  { label: 'Primary Threat', value: 'Ice Edge' },
  { label: 'Action', value: 'Northern Corridor' },
];

export default function Copilot() {
  return (
    <SectionShell num="12" label="AI Copilot">
      <div className="lp-split">
        <div className="lp-stack-lg">
          <SectionReveal from="up">
            <h2 className="lp-display-sm">
              Meet your Antarctic<br />
              <span className="lp-gradient-text">AI copilot</span>
            </h2>
          </SectionReveal>
          <SectionReveal from="up" delay={120}>
            <p className="lp-lede">
              Ask the question the way a bridge officer would ask it. The copilot
              answers from the system&apos;s own state — forecast fields, drift
              ensembles, and route costs — and cites what it drew on.
            </p>
          </SectionReveal>
          <SectionReveal from="up" delay={180}>
            <p className="lp-lede" style={{ fontSize: 'var(--font-size-md)' }}>
              An answer without provenance is just a guess with better grammar.
              Every figure the copilot returns traces back to a specific endpoint
              in the system.
            </p>
          </SectionReveal>
          <SectionReveal from="fade" delay={240}>
            <span className="lp-badge-sim">Planned Capability · Scripted Example</span>
          </SectionReveal>
        </div>

        <SectionReveal from="right" delay={140}>
          <div className="lp-panel lp-framed">
            <div className="lp-panel-head">
              <span className="lp-telemetry-item lp-mono"><Bot size={13} /> CryoNav Copilot</span>
              <span className="lp-mono lp-dim">Session · Illustrative</span>
            </div>

            <div className="lp-chat">
              <div className="lp-chat-msg lp-chat-user">
                <span className="lp-mono lp-dim" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <User size={11} /> Bridge
                </span>
                Can we safely reach the research station within 48 hours?
              </div>

              <div className="lp-chat-msg lp-chat-ai">
                <span className="lp-mono lp-dim" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Bot size={11} /> CryoNav
                </span>
                Current conditions indicate a viable route within the window.
                Recommended corridor: northern sector, clearing the projected
                drift envelope with margin. The southern approach meets the
                deadline but carries elevated ice exposure through the final leg.
              </div>
            </div>

            <div className="lp-chat-facts">
              {FACTS.map((f) => (
                <div key={f.label} className="lp-chat-fact">
                  <div className="lp-mono" style={{ color: 'var(--lp-frost)', fontSize: 'var(--font-size-md)', letterSpacing: 0 }}>
                    {f.value}
                  </div>
                  <div className="lp-metric-label" style={{ marginTop: 4 }}>{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </SectionShell>
  );
}
