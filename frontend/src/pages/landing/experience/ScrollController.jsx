/* ScrollController — turns document scroll into a smoothed 0→1 value.

   Writes to a ref rather than state, and eases toward the raw scroll
   position so the camera glides instead of snapping to wheel steps.
   The easing runs on its own rAF loop that idles out once it has
   settled, so a stationary page costs nothing. */

import { useEffect, useRef } from 'react';

export function useScrollDriver({ smoothing = 0.12 } = {}) {
  const target = useRef(0);   // raw scroll position
  const value = useRef(0);    // eased value the scene reads

  useEffect(() => {
    let raf = null;
    let settling = false;

    const measure = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      target.current = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));
      if (!settling) {
        settling = true;
        raf = requestAnimationFrame(ease);
      }
    };

    const ease = () => {
      const diff = target.current - value.current;
      if (Math.abs(diff) < 0.0002) {
        value.current = target.current;
        settling = false;                 // idle out — no permanent loop
        raf = null;
        return;
      }
      value.current += diff * smoothing;
      raf = requestAnimationFrame(ease);
    };

    measure();
    value.current = target.current;
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [smoothing]);

  return value;
}

export default useScrollDriver;
