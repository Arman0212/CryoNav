/* ═══════════════════════════════════════════════════════════════
   Clouds.jsx — Translucent Drifting Vector Clouds
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function Clouds({ progress = 0 }) {
  const drift = progress * 60;

  return (
    <g id="layer-clouds" opacity="0.75" transform={`translate(${drift}, 0)`}>
      {/* Cloud 1 */}
      <path
        d="M 100,120 Q 140,80 200,90 Q 260,70 320,100 Q 380,80 430,110 Q 470,140 420,170 Q 350,180 280,175 Q 180,180 120,160 Z"
        fill="#ffffff"
        opacity="0.85"
      />
      {/* Cloud 2 */}
      <path
        d="M 700,90 Q 750,50 820,70 Q 890,40 960,80 Q 1020,60 1070,95 Q 1110,130 1050,150 Q 960,165 850,155 Q 750,160 700,130 Z"
        fill="#ffffff"
        opacity="0.7"
      />
      {/* Cloud 3 (Distant) */}
      <path
        d="M -100,150 Q -50,120 20,130 Q 80,110 140,140 Q 180,160 130,180 Q 50,190 -20,180 Z"
        fill="#e2e8f0"
        opacity="0.5"
      />
    </g>
  );
}
