/* ═══════════════════════════════════════════════════════════════
   Ocean.jsx — Antarctic Ocean Surface & Waves
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function Ocean() {
  return (
    <g id="layer-ocean">
      <defs>
        <linearGradient id="oceanSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dcecf7" />
          <stop offset="30%" stopColor="#cde4f5" />
          <stop offset="100%" stopColor="#b4d7f2" />
        </linearGradient>
      </defs>

      {/* Main Ocean Surface */}
      <rect x="-400" y="415" width="2200" height="700" fill="url(#oceanSurfaceGrad)" />

      {/* Wave Contours & Water Ripple Contours */}
      <g stroke="#9bc8e9" strokeWidth="1.2" fill="none" opacity="0.65">
        <path d="M -100,460 C 100,450 300,470 500,455 C 700,440 900,465 1100,450 C 1300,435 1500,455 1700,445" />
        <path d="M -200,510 C 50,520 250,495 480,515 C 710,530 920,505 1150,525 C 1380,545 1550,515 1800,530" />
        <path d="M -50,580 C 180,570 380,590 600,575 C 820,560 1020,585 1250,570 C 1480,555 1620,575 1800,565" />
        <path d="M -150,650 C 120,660 340,635 560,655 C 780,670 980,645 1200,665 C 1420,685 1600,655 1800,670" />
        <path d="M -80,730 C 150,720 380,740 620,725 C 860,710 1080,735 1300,720 C 1520,705 1680,725 1800,715" />
      </g>
    </g>
  );
}
