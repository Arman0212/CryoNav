/* ═══════════════════════════════════════════════════════════════
   useAutoSequence — "play forward, then release" scroll sequences.

   When the section scrolls into view it snaps into place, holds the page
   still, and plays its animation once from 0 → 1. Scrolling resumes as
   soon as the sequence completes. It never replays, so scrolling back up
   can't trap the reader a second time.

   Escape hatches (a locked page must always be escapable):
     • Esc, or any click, jumps to the end and releases immediately
     • prefers-reduced-motion skips the lock entirely (final state shown)
     • a hard timeout releases the page even if a frame is dropped
     • scrollbar dragging still works — only wheel/touch/keys are held
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const BLOCKED_KEYS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'];

/**
 * @param {Object} [options]
 * @param {number} [options.duration=3600] - Play time in ms
 * @param {number} [options.threshold=0.7] - Visibility ratio that triggers the sequence
 * @returns {[React.RefObject, number, boolean]} [ref, progress 0..1, isPlaying]
 */
export function useAutoSequence({ duration = 3600, threshold = 0.7 } = {}) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playedRef = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Reduced motion: no lock, no animation — show the completed state.
    if (reduced) {
      setProgress(1);
      playedRef.current = true;
      return undefined;
    }

    let raf = null;
    let startTs = 0;
    let hardStop = null;
    let locked = false;

    const preventDefault = (e) => e.preventDefault();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (BLOCKED_KEYS.includes(e.key)) e.preventDefault();
    };

    const lockScroll = () => {
      if (locked) return;
      locked = true;
      window.addEventListener('wheel', preventDefault, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
      window.addEventListener('keydown', onKeyDown, { passive: false });
      window.addEventListener('click', finish);
    };

    const unlockScroll = () => {
      if (!locked) return;
      locked = false;
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', finish);
    };

    /** Jump to the end and hand scrolling back to the user. */
    function finish() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      if (hardStop !== null) { clearTimeout(hardStop); hardStop = null; }
      unlockScroll();
      setProgress(1);
      setPlaying(false);
      playedRef.current = true;
    }

    const step = (ts) => {
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      // Ease-out so the sequence settles rather than stopping dead
      setProgress(Math.round((1 - Math.pow(1 - t, 2)) * 200) / 200);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        finish();
      }
    };

    const start = () => {
      if (playedRef.current || playing) return;
      playedRef.current = true;
      setPlaying(true);
      lockScroll();

      // Snap the section into place, then play.
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        startTs = 0;
        raf = requestAnimationFrame(step);
      }, 420);

      // Safety net: never hold the page longer than the sequence needs.
      hardStop = window.setTimeout(finish, duration + 1600);
    };

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); },
      { threshold }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
      if (hardStop !== null) clearTimeout(hardStop);
      unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, threshold, reduced]);

  return [ref, progress, playing];
}

export default useAutoSequence;
