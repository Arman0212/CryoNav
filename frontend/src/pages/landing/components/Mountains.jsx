/* ═══════════════════════════════════════════════════════════════
   Mountains.jsx — Layered Antarctic Glacier Peaks & Ridges
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function Mountains({ progress = 0 }) {
  const pShift = progress * 40;

  return (
    <g id="layer-mountains">
      <defs>
        <linearGradient id="mtnGradFar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d2e4f2" />
          <stop offset="100%" stopColor="#e5eff7" />
        </linearGradient>

        <linearGradient id="mtnGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b4d4eb" />
          <stop offset="100%" stopColor="#dbebf5" />
        </linearGradient>

        <linearGradient id="mtnGradNear" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94c0e3" />
          <stop offset="100%" stopColor="#cfdff0" />
        </linearGradient>
      </defs>

      {/* Layer 1: Distant Pale Peaks */}
      <path
        d={`M -200,320 L -80,210 L 40,260 L 180,180 L 320,270 L 480,160 L 640,250 L 780,170 L 950,280 L 1100,190 L 1280,260 L 1450,200 L 1600,320 Z`}
        fill="url(#mtnGradFar)"
        transform={`translate(${-pShift * 0.3}, 0)`}
      />

      {/* Layer 2: Mid-distance Glacier Ridges */}
      <path
        d={`M -200,350 L -40,240 L 120,300 L 280,210 L 420,290 L 580,200 L 740,310 L 890,220 L 1050,300 L 1220,220 L 1400,290 L 1600,350 Z`}
        fill="url(#mtnGradMid)"
        transform={`translate(${-pShift * 0.5}, 0)`}
      />

      {/* Layer 3: Craggy Foreground Peaks with Snow Highlights */}
      <g transform={`translate(${-pShift * 0.8}, 0)`}>
        <path
          d="M -200,380 L 10,270 L 150,340 L 310,240 L 490,360 L 660,250 L 820,350 L 980,260 L 1160,360 L 1350,280 L 1600,380 Z"
          fill="url(#mtnGradNear)"
        />
        {/* Snow Cap Highlights */}
        <polygon points="310,240 280,280 340,280" fill="#ffffff" opacity="0.9" />
        <polygon points="660,250 630,290 690,295" fill="#ffffff" opacity="0.95" />
        <polygon points="980,260 950,300 1010,305" fill="#ffffff" opacity="0.9" />
      </g>
    </g>
  );
}
