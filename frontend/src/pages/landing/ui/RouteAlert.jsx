/* RouteAlert — the cinematic beat where the system speaks.

   Appears when the drift envelope intersects the corridor and leaves once
   the vessel has taken the new heading. Opacity is written through a ref
   so it can fade with scroll without re-rendering.

   The numbers quoted are the real difference between the two corridors
   the router returned (balanced vs min_ice), taken from the baked
   comparison table — not invented for the animation. */

import React, { useEffect, useRef } from 'react';
import { TriangleAlert, ArrowRight } from 'lucide-react';
import { useMission } from '../experience/MissionController';

export default function RouteAlert() {
  const { state, data } = useMission();
  const box = useRef(null);

  useEffect(() => {
    let raf = null;
    const paint = () => {
      raf = requestAnimationFrame(paint);
      const s = state.current;
      if (!s || !box.current) return;
      const v = s.alertVisible;
      box.current.style.opacity = String(v);
      box.current.style.transform = `translate3d(0, ${(1 - v) * 14}px, 0)`;
      box.current.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      box.current.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const bal = data.metrics?.balanced;
  const ice = data.metrics?.min_ice;
  const dNm = bal && ice ? Math.round(ice.distance_nm - bal.distance_nm) : null;
  const dH = bal && ice ? Math.round(ice.time_h - bal.time_h) : null;

  return (
    <div className="lp3-alert" ref={box}>
      <div className="lp3-alert-head">
        <TriangleAlert size={15} />
        <span>Route risk detected</span>
      </div>
      <p className="lp3-alert-body">
        Iceberg drift envelope intersects the current corridor.
        CryoNav recommends an alternative route.
      </p>
      {dNm !== null && (
        <div className="lp3-alert-trade">
          <span><strong>+{dNm}</strong> nm</span>
          <span><strong>+{dH}</strong> h</span>
          <span className="lp3-alert-gain">Clears envelope <ArrowRight size={11} /></span>
        </div>
      )}
    </div>
  );
}
