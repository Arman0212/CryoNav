/* ═══════════════════════════════════════════════════════════════
   ResearchVessel.jsx — High-Detail Vector Antarctic Research Vessel
   Full vector icebreaker illustration with multi-tier bridge, mast,
   lifeboats, helipad, water spray & trailing foam wake.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { getShipState } from '../animation/missionTimeline';

export default function ResearchVessel({ progress = 0 }) {
  const { x, y, angle } = getShipState(progress);

  // Subtle floating pitch & roll bobbing
  const [bob, setBob] = useState(0);
  useEffect(() => {
    let animId;
    function animate(t) {
      setBob(Math.sin(t / 350) * 1.6);
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalAngle = angle + bob;

  return (
    <g id="layer-research-vessel" transform={`translate(${x}, ${y}) rotate(${totalAngle})`}>
      <defs>
        {/* Ocean Wake Gradient */}
        <linearGradient id="vesselWakeGrad" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#cce3f5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#b0d5f2" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="hullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>

        <linearGradient id="deckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* ── Trailing Water Wake Foam ── */}
      <polygon points="-45,0 -180,-28 -210,0 -180,28" fill="url(#vesselWakeGrad)" />
      <polygon points="-45,0 -120,-15 -140,0 -120,15" fill="#ffffff" opacity="0.75" />
      <circle cx="-130" cy="-6" r="4" fill="#ffffff" opacity="0.6" />
      <circle cx="-150" cy="8" r="6" fill="#ffffff" opacity="0.5" />

      {/* ── V-Shaped Bow Water Spray ── */}
      <path d="M 52,0 L 70,-12 L 60,0 L 70,12 Z" fill="#ffffff" opacity="0.8" />

      {/* ── Main Vessel Body (Icebreaker Hull) ── */}
      <g stroke="#0f172a" strokeWidth="0.8" strokeLinejoin="round">
        {/* Lower Icebreaker Hull (Red) */}
        <path
          d="M 55,0 C 40,-20 -15,-20 -45,-16 L -45,16 C -15,20 40,20 55,0 Z"
          fill="url(#hullGrad)"
        />

        {/* White Deck Trim */}
        <path
          d="M 42,0 C 28,-14 -12,-14 -40,-12 L -40,12 C -12,14 28,14 42,0 Z"
          fill="url(#deckGrad)"
        />

        {/* Superstructure (Main Bridge Block) */}
        <rect x="-10" y="-10" width="22" height="20" rx="3" fill="#ffffff" />
        <rect x="2" y="-8" width="8" height="16" rx="2" fill="#e2e8f0" />

        {/* Bridge Tinted Glass Windows */}
        <rect x="-8" y="-8" width="18" height="16" rx="1.5" fill="#0284c7" />
        <line x1="-3" y1="-8" x2="-3" y2="8" stroke="#ffffff" strokeWidth="0.6" />
        <line x1="3" y1="-8" x2="3" y2="8" stroke="#ffffff" strokeWidth="0.6" />

        {/* Orange Emergency Lifeboats */}
        <ellipse cx="-18" cy="-11" rx="5" ry="2.5" fill="#ea580c" />
        <ellipse cx="-18" cy="11" rx="5" ry="2.5" fill="#ea580c" />

        {/* Exhaust Funnel Stack */}
        <rect x="-24" y="-5" width="7" height="10" rx="1.5" fill="#334155" />
        <circle cx="-20.5" cy="0" r="2" fill="#ef4444" />

        {/* Communication Radar Mast */}
        <line x1="5" y1="-10" x2="5" y2="-22" stroke="#334155" strokeWidth="1.8" />
        <line x1="1" y1="-17" x2="9" y2="-17" stroke="#334155" strokeWidth="1.2" />
        <circle cx="5" cy="-22" r="3.5" fill="#0284c7" />

        {/* Stern Helipad Marking */}
        <circle cx="-33" cy="0" r="7" fill="none" stroke="#475569" strokeWidth="1" />
        <text x="-35.5" y="3" fontSize="6.5" fontWeight="900" fill="#475569" fontFamily="sans-serif">H</text>
      </g>
    </g>
  );
}
