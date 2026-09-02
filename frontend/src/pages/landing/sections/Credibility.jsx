/* SECTION 14 — SCIENTIFIC CREDIBILITY
   States plainly what is operational versus what is prototype. The
   limitations listed here are the repository's own documented ones — being
   straight about them is the point of the section. */
import React from 'react';
import { Database, Brain, Gauge, CheckCircle2 } from 'lucide-react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const PILLARS = [
  { icon: Database, name: 'Data', desc: 'Peer-reviewed satellite and reanalysis records, used at native resolution — the target grid is never resampled.' },
  { icon: Brain, name: 'Models', desc: 'A learned ice forecaster alongside a physics-based drift model, each measured against explicit baselines.' },
  { icon: Gauge, name: 'Uncertainty', desc: 'Ensemble spread is carried through to the route rather than collapsed into a single confident line.' },
  { icon: CheckCircle2, name: 'Validation', desc: 'Held-out dates never seen during training, with baselines that a forecast has to actually beat.' },
];

const STATUS = [
  { label: 'Sea-ice data pipeline', state: 'Operational', real: true },
  { label: 'Routing engine (A*)', state: 'Operational', real: true },
  { label: 'Berg drift ensemble', state: 'Synthetic forcing', real: false },
  { label: 'U-Net ice forecast', state: 'Not yet trained', real: false },
  { label: 'Berg risk in routing', state: 'Not yet wired', real: false },
  { label: 'Ocean (CMEMS) feed', state: 'Not connected', real: false },
];

export default function Credibility() {
  return (
    <SectionShell num="14" label="Scientific Credibility">
      <div className="lp-stack-lg">
        <SectionReveal from="up">
          <h2 className="lp-display-sm">
            Decision support,<br />
            <span className="lp-gradient-text">not blind trust</span>
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            A system that overstates its confidence is worse than no system at all,
            because someone will sail on it. CryoNav is built to be checkable: what
            is measured, what is modelled, and what is still a prototype are kept
            visibly distinct.
          </p>
        </SectionReveal>
      </div>

      <div className="lp-cred">
        {PILLARS.map((p, i) => (
          <SectionReveal key={p.name} from="up" delay={i * 80} className="lp-panel">
            <p.icon size={20} style={{ color: 'var(--lp-cyan)', marginBottom: 'var(--space-3)' }} />
            <div className="lp-force-name">{p.name}</div>
            <div className="lp-force-desc" style={{ marginTop: 'var(--space-2)' }}>{p.desc}</div>
          </SectionReveal>
        ))}
      </div>

      <SectionReveal from="up" delay={120}>
        <div className="lp-panel lp-framed" style={{ marginTop: 'var(--space-8)' }}>
          <div className="lp-panel-head">
            <span className="lp-mono lp-dim">Current Prototype Status</span>
            <span className="lp-mono lp-dim">Honest Accounting</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%),1fr))', gap: 'var(--space-3)' }}>
            {STATUS.map((s) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--lp-hairline)' }}>
                <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--lp-steel)' }}>{s.label}</span>
                <span className={`lp-badge-sim ${s.real ? 'lp-badge-real' : ''}`}>{s.state}</span>
              </div>
            ))}
          </div>
          <p className="lp-lede" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-5)' }}>
            Known limits carried openly: a 25 km grid cannot resolve the leads a
            ship actually threads, passive-microwave retrievals degrade under
            summer melt, and cost-model coefficients are illustrative until tuned
            against vessel-specific data. This is decision support — not
            autonomous navigation.
          </p>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
