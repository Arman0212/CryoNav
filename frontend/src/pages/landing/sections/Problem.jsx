/* SECTION 02 — THE PROBLEM
   The Southern Ocean as a moving target. Environmental forces are described
   qualitatively — no invented statistics. */
import React from 'react';
import { Snowflake, Wind, Waves, Navigation, Anchor, EyeOff } from 'lucide-react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const FORCES = [
  { icon: Snowflake, name: 'Sea Ice', desc: 'Concentration and edge position shift daily, opening and closing passages.' },
  { icon: Anchor, name: 'Icebergs', desc: 'Drifting mass with its own momentum, independent of the pack around it.' },
  { icon: Wind, name: 'Wind', desc: 'Drives both the ice and the vessel; the dominant forcing term in berg drift.' },
  { icon: Waves, name: 'Waves', desc: 'Southern Ocean swell limits safe speed and workable sea states.' },
  { icon: Navigation, name: 'Currents', desc: 'The Antarctic Circumpolar Current sets the background transport field.' },
  { icon: EyeOff, name: 'Visibility', desc: 'Fog, blowing snow, and polar darkness reduce what a bridge crew can see.' },
];

export default function Problem() {
  return (
    <SectionShell id="mission" num="02" label="The Problem">
      <div className="lp-split">
        <div className="lp-stack-lg">
          <SectionReveal from="up">
            <h2 className="lp-display">
              Navigating the most<br />
              <span className="lp-gradient-text">unpredictable ocean</span><br />
              on Earth
            </h2>
          </SectionReveal>

          <SectionReveal from="up" delay={120}>
            <p className="lp-lede">
              A route planned from this morning&apos;s chart may not exist this evening.
              The Southern Ocean is not a static obstacle course — it is a coupled
              system where ice, wind, current, and swell reshape the passage
              continuously.
            </p>
          </SectionReveal>

          <SectionReveal from="up" delay={200}>
            <p className="lp-lede">
              Resupply missions to Antarctic research stations operate inside narrow
              seasonal windows. The cost of a wrong routing decision is measured in
              fuel, in time, and in risk to the vessel and crew.
            </p>
          </SectionReveal>
        </div>

        <SectionReveal from="right" delay={140}>
          <div className="lp-panel lp-framed">
            <div className="lp-panel-head">
              <span className="lp-mono lp-dim">Environmental State</span>
              <span className="lp-telemetry-item lp-mono"><span className="lp-status-dot is-warn" /> Dynamic</span>
            </div>
            <p className="lp-lede" style={{ fontSize: 'var(--font-size-md)' }}>
              Every one of these variables changes on a timescale shorter than a
              voyage. Planning against a single snapshot means planning against
              conditions that have already moved on.
            </p>
          </div>
        </SectionReveal>
      </div>

      <div className="lp-forces">
        {FORCES.map((force, i) => (
          <SectionReveal key={force.name} from="up" delay={i * 70} className="lp-force">
            <force.icon size={20} className="lp-force-icon" />
            <div className="lp-force-name">{force.name}</div>
            <div className="lp-force-desc">{force.desc}</div>
          </SectionReveal>
        ))}
      </div>
    </SectionShell>
  );
}
