/* ScrollProgress — hairline progress bar pinned to the top of the viewport,
   plus a mono readout of scroll depth. Reads document scroll once per frame. */
import React, { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = null;
    let last = -1;

    const measure = () => {
      frame = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const value = max <= 0 ? 0 : Math.round((window.scrollY / max) * 1000) / 10;
      if (value !== last) {
        last = value;
        setPct(value);
      }
    };

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className="lp-progress" aria-hidden="true">
        <div className="lp-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <div className="lp-progress-readout lp-mono" aria-hidden="true">
        {String(Math.round(pct)).padStart(3, '0')}<span className="lp-dim">%</span>
      </div>
    </>
  );
}
