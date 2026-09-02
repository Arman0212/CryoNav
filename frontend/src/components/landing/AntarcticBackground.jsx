/* ═══════════════════════════════════════════════════════════════
   AntarcticBackground — scroll-driven photographic parallax.

   Three real Antarctic photographs (Wikimedia Commons — credited in the
   page footer) cross-fade as the reader descends: a tabular berg at sea,
   a pale ice wall, then an icebreaker working through pack ice. Each
   drifts slowly and scales a touch, so the scene is always in motion
   without ever pulling focus from the type above it.

   A light veil sits over the photography so navy display type stays
   legible on a bright page; the veil lifts slightly mid-page where the
   imagery should carry the section, then returns.

   Performance: ONE passive scroll listener batched in rAF, writing
   straight to the DOM — no React state, so scrolling causes zero
   re-renders. Only transform/opacity are animated (compositor only).
   ═══════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '@hooks/useReducedMotion';

const PARTICLE_COUNT = 34;
const FRAME_MS = 1000 / 30;

/** Smooth 0→1→0 band, so each photo fades up and back down in its stretch */
function band(p, start, end, feather = 0.12) {
  if (p <= start - feather || p >= end + feather) return 0;
  if (p < start) return (p - (start - feather)) / feather;
  if (p > end) return 1 - (p - end) / feather;
  return 1;
}

export default function AntarcticBackground() {
  const canvasRef = useRef(null);
  const photoARef = useRef(null);
  const photoBRef = useRef(null);
  const photoCRef = useRef(null);
  const veilRef = useRef(null);
  const foreRef = useRef(null);
  const reduced = useReducedMotion();

  /* ── Scroll-driven scene ── */
  useEffect(() => {
    if (reduced) return undefined;
    let frame = null;

    const apply = () => {
      frame = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));

      // Each photo owns a stretch of the page and drifts while it's up
      const a = band(p, 0, 0.3);
      const b = band(p, 0.36, 0.64);
      const c = band(p, 0.7, 1);

      if (photoARef.current) {
        photoARef.current.style.opacity = String(a);
        photoARef.current.style.transform = `translate3d(0, ${p * -70}px, 0) scale(${1 + p * 0.06})`;
      }
      if (photoBRef.current) {
        photoBRef.current.style.opacity = String(b);
        photoBRef.current.style.transform = `translate3d(0, ${(p - 0.5) * -80}px, 0) scale(${1.02 + p * 0.04})`;
      }
      if (photoCRef.current) {
        photoCRef.current.style.opacity = String(c);
        photoCRef.current.style.transform = `translate3d(0, ${(p - 1) * -70}px, 0) scale(${1.04 - p * 0.03})`;
      }
      // Let the imagery breathe through the middle of the page
      if (veilRef.current) {
        veilRef.current.style.opacity = String(0.98 - Math.sin(p * Math.PI) * 0.2);
      }
      if (foreRef.current) {
        foreRef.current.style.transform = `translate3d(0, ${p * -190}px, 0)`;
      }
    };

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  /* ── Drifting snow / ice particles ── */
  useEffect(() => {
    if (reduced) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let raf = null;
    let lastFrame = 0;
    let particles = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.14,
        vy: Math.random() * 0.12 + 0.03,
        a: Math.random() * 0.22 + 0.06,
      }));
    };

    const draw = (ts) => {
      raf = requestAnimationFrame(draw);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height + 5) { p.y = -5; p.x = Math.random() * width; }
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`;
        ctx.fill();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      } else if (raf === null) {
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    seed();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div className="lp-bg" aria-hidden="true">
      <div className="lp-bg-sky" />

      {/* Real Antarctic photography, cross-faded through the story */}
      <div ref={photoARef} className="lp-bg-photo lp-bg-photo-a" />
      <div ref={photoBRef} className="lp-bg-photo lp-bg-photo-b" />
      <div ref={photoCRef} className="lp-bg-photo lp-bg-photo-c" />

      <div ref={veilRef} className="lp-bg-veil" />

      {/* Foreground brash ice for depth in front of the photography */}
      <div ref={foreRef} className="lp-bg-layer lp-bg-fore">
        <svg viewBox="0 0 1600 240" preserveAspectRatio="xMidYMax slice">
          <path d="M0 240 L0 150 L70 112 L140 152 L210 118 L300 168 L380 130 L470 176 L560 140
                   L660 186 L760 148 L880 190 L1000 152 L1120 194 L1240 156 L1360 196 L1480 158
                   L1600 192 L1600 240 Z"
            fill="#ffffff" fillOpacity="0.85" />
          <path d="M0 150 L70 112 L140 152 M210 118 L300 168 M380 130 L470 176 M560 140 L660 186
                   M760 148 L880 190 M1000 152 L1120 194 M1240 156 L1360 196"
            fill="none" stroke="rgba(11,127,168,0.28)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="lp-bg-grid" />
      <canvas ref={canvasRef} className="lp-bg-particles" />
    </div>
  );
}
