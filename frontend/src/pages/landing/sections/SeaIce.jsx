/* SECTION 04 — SEA-ICE INTELLIGENCE
   Sticky forecast timeline. The ice field visual advances CURRENT → +24 →
   +48 → +72 as the user scrolls.

   The field shown is an illustrative pattern, not model output — it is
   labelled as simulated throughout. The U-Net described here exists in the
   repository (src/ice/), but is not claimed to be validated or trained. */
import React, { useMemo } from 'react';
import { useAutoSequence } from '@hooks/useAutoSequence';
import SequenceHint from '@components/landing/SequenceHint';
import { getSicColor } from '@utils/colorScales';

const STEPS = ['Current', '+24 Hours', '+48 Hours', '+72 Hours'];
const COLS = 30;
const ROWS = 16;

/** Deterministic, smoothly-evolving pseudo ice field — illustrative only. */
function fieldValue(x, y, step) {
  const t = step * 0.9;
  const edge = 8.5 + Math.sin(x * 0.36 + t) * 2.1 + Math.cos(x * 0.17 - t * 0.7) * 1.6;
  const dist = y - edge;
  const base = 1 / (1 + Math.exp(-dist * 0.85));
  const texture = 0.12 * Math.sin(x * 0.8 + y * 0.6 + t * 1.4);
  return Math.max(0, Math.min(1, base + texture));
}

export default function SeaIce() {
  const [trackRef, progress, playing] = useAutoSequence({ duration: 3800 });
  const step = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length * 0.999));

  const cells = useMemo(() => {
    const out = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        out.push({ x, y, v: fieldValue(x, y, step) });
      }
    }
    return out;
  }, [step]);

  return (
    <section className="lp-section" style={{ padding: 0 }}>
      <SequenceHint active={playing} progress={progress} label="Advancing forecast" />
      <div ref={trackRef} className="lp-track">
        <div className="lp-stage-solo">
          <div className="lp-section-inner lp-stack-lg">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-num">04</span>
              <span className="lp-eyebrow-rule" />
              <span className="lp-eyebrow-text">Sea-Ice Intelligence</span>
            </div>

            <div className="lp-split" style={{ alignItems: 'center' }}>
              <div className="lp-stack-md">
                <h2 className="lp-display-sm">
                  See the ice<br />
                  <span className="lp-gradient-text">before you reach it</span>
                </h2>
                <p className="lp-lede">
                  A U-Net over the passive-microwave record projects sea-ice
                  concentration across a 1–14 day horizon, with the headline
                  forecast at day seven. The router consumes the forecast field
                  as it advances — not a single frozen snapshot.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span className="lp-badge-sim">Illustrative Field</span>
                  <span className="lp-mono lp-dim" style={{ alignSelf: 'center' }}>
                    Model in repository · not yet validated
                  </span>
                </div>
              </div>

              <div className="lp-panel lp-framed">
                <div className="lp-panel-head">
                  <span className="lp-mono lp-dim">SIC Forecast Field</span>
                  <span className="lp-mono lp-accent">{STEPS[step]}</span>
                </div>

                <svg className="lp-svg" viewBox={`0 0 ${COLS * 10} ${ROWS * 10}`}
                  role="img" aria-label={`Illustrative sea-ice concentration field at ${STEPS[step]}`}>
                  {cells.map((c) => (
                    <rect
                      key={`${c.x}-${c.y}`}
                      x={c.x * 10} y={c.y * 10} width={10} height={10}
                      fill={getSicColor(c.v * 100, 0.92)}
                      style={{ transition: 'fill 700ms ease-out' }}
                    />
                  ))}
                  {/* Ice-edge reference line at the 15% concentration threshold */}
                  <path
                    d={Array.from({ length: COLS }, (_, x) => {
                      const edge = 8.5 + Math.sin(x * 0.36 + step * 0.9) * 2.1
                        + Math.cos(x * 0.17 - step * 0.63) * 1.6;
                      return `${x === 0 ? 'M' : 'L'}${x * 10 + 5},${edge * 10}`;
                    }).join(' ')}
                    fill="none" stroke="#0b7fa8" strokeWidth="1.5" strokeDasharray="4 4"
                    style={{ transition: 'd 700ms ease-out' }}
                  />
                </svg>

                <div className="lp-timeline-steps">
                  {STEPS.map((label, i) => (
                    <div key={label} className={`lp-timeline-step ${i === step ? 'is-active' : ''}`}>
                      {label}
                    </div>
                  ))}
                </div>

                <p className="lp-mono lp-dim" style={{ marginTop: 'var(--space-3)', letterSpacing: '0.1em' }}>
                  Blue = open water · White = consolidated pack · Dashed = ice edge (15%)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
