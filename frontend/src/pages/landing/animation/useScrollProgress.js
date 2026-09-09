/* ═══════════════════════════════════════════════════════════════
   useScrollProgress — Smooth 60fps scroll progress (0..1)
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const currentScroll = Math.max(0, window.scrollY || doc.scrollTop || document.body.scrollTop || 0);
      const rawProgress = Math.min(1, Math.max(0, currentScroll / scrollHeight));
      targetProgressRef.current = rawProgress;
    }

    function updateLoop() {
      const diff = targetProgressRef.current - smoothProgressRef.current;
      if (Math.abs(diff) > 0.0001) {
        smoothProgressRef.current += diff * 0.14; // Smooth lerp factor
        setProgress(smoothProgressRef.current);
      } else if (smoothProgressRef.current !== targetProgressRef.current) {
        smoothProgressRef.current = targetProgressRef.current;
        setProgress(smoothProgressRef.current);
      }
      animFrameRef.current = requestAnimationFrame(updateLoop);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return progress;
}
