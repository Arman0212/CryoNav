/* SECTION 03 — THE CRYONAV IDEA
   Sticky scrollytelling: the data pipeline lights up node by node as the
   user scrolls, turning raw observation into a routing decision. */
import React from 'react';
import { useAutoSequence } from '@hooks/useAutoSequence';
import SequenceHint from '@components/landing/SequenceHint';

const NODES = [
  { name: 'Satellites', desc: 'Passive-microwave and scatterometer observation of the ice pack' },
  { name: 'Sea-Ice Data', desc: 'NSIDC concentration record on the native 25 km polar grid' },
  { name: 'Weather', desc: 'ERA5 atmospheric reanalysis — wind fields and surface forcing' },
  { name: 'Ocean', desc: 'Currents, sea-surface height, and transport from reanalysis' },
  { name: 'AI + Physics', desc: 'U-Net ice forecasting alongside momentum-balance berg drift' },
  { name: 'Risk', desc: 'POLARIS-style ice-class risk indexing per grid cell' },
  { name: 'Route', desc: 'Time-expanded A* search across the evolving forecast field' },
  { name: 'Decision', desc: 'Ranked alternatives with the reasoning behind each one' },
];

export default function Pipeline() {
  const [trackRef, progress, playing] = useAutoSequence({ duration: 4200 });
  // Light nodes progressively across the sequence
  const lit = Math.ceil(Math.min(1, progress / 0.94) * NODES.length);

  return (
    <section id="intelligence" className="lp-section" style={{ padding: 0 }}>
      <SequenceHint active={playing} progress={progress} label="Building pipeline" />
      <div ref={trackRef} className="lp-track">
        <div className="lp-stage-solo">
          <div className="lp-section-inner">
            <div className="lp-split" style={{ alignItems: 'start' }}>
              <div className="lp-stack-lg">
                <div className="lp-eyebrow">
                  <span className="lp-eyebrow-num">03</span>
                  <span className="lp-eyebrow-rule" />
                  <span className="lp-eyebrow-text">The CryoNav Idea</span>
                </div>

                <h2 className="lp-display">
                  From raw data<br />to <span className="lp-gradient-text">decision</span>
                </h2>

                <p className="lp-lede">
                  CryoNav is a pipeline, not a map. Observation becomes forecast,
                  forecast becomes risk, and risk becomes a route you can defend
                  to the people who have to sail it.
                </p>

                <div className="lp-telemetry">
                  <span className="lp-telemetry-item">
                    <span className="lp-status-dot" />
                    Stage {String(Math.min(lit, NODES.length)).padStart(2, '0')} / {NODES.length}
                  </span>
                </div>
              </div>

              <div className="lp-pipeline">
                {NODES.map((node, i) => (
                  <React.Fragment key={node.name}>
                    {i > 0 && <span className="lp-pipe-rail" aria-hidden="true" />}
                    <div className={`lp-pipe-node ${i < lit ? 'is-lit' : ''}`}>
                      <span className="lp-pipe-index">{String(i + 1).padStart(2, '0')}</span>
                      <span className="lp-pipe-body">
                        <span className="lp-pipe-name">{node.name}</span>
                        <span className="lp-pipe-desc">{node.desc}</span>
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
