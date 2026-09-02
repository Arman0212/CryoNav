/* useScrollProgress — 0..1 progress of an element travelling through the
   viewport, for sticky "scrollytelling" sections.

   Performance notes: a single passive scroll listener per section, all reads
   batched inside requestAnimationFrame, and state only updated when the
   quantised value actually changes — so React re-renders at most ~100 times
   across a full section traverse rather than on every scroll event. */
import { useEffect, useRef, useState } from 'react';

/**
 * @param {Object} [options]
 * @param {number} [options.steps=100] - Quantisation; higher = smoother, more renders
 * @returns {[React.RefObject, number]} [ref, progress 0..1]
 */
export function useScrollProgress({ steps = 100 } = {}) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let frame = null;
    let last = -1;

    const measure = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the element's top hits the viewport top,
      // 1 when its bottom reaches the viewport bottom.
      const scrollable = rect.height - vh;
      const raw = scrollable <= 0 ? 0 : -rect.top / scrollable;
      const clamped = Math.max(0, Math.min(1, raw));
      const quantised = Math.round(clamped * steps) / steps;
      if (quantised !== last) {
        last = quantised;
        setProgress(quantised);
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
  }, [steps]);

  return [ref, progress];
}

export default useScrollProgress;
