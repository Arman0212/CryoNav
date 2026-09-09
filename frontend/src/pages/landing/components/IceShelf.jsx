/* ═══════════════════════════════════════════════════════════════
   IceShelf.jsx — Glacier Cliffs & Coastal Ice Plain
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function IceShelf() {
  return (
    <g id="layer-ice-shelf">
      <defs>
        <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e1eff9" />
          <stop offset="100%" stopColor="#bce0f7" />
        </linearGradient>
      </defs>

      {/* Coastal Ice Shelf Slope */}
      <path
        d="M -200,360 Q 150,380 450,370 Q 800,365 1200,375 Q 1400,380 1600,360 L 1600,410 Q 1200,420 800,415 Q 450,420 -200,410 Z"
        fill="url(#shelfGrad)"
      />
      {/* Ice Cliff Shadow Edge */}
      <path
        d="M -200,410 Q 450,420 800,415 Q 1200,420 1600,410 L 1600,418 Q 1200,428 800,423 Q 450,428 -200,418 Z"
        fill="#77b1dc"
        opacity="0.7"
      />
    </g>
  );
}
