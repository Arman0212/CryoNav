/* ═══════════════════════════════════════════════════════════════
   Sky.jsx — Vector Antarctic Atmosphere & Polar Sun
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function Sky({ parallaxOffset = 0 }) {
  return (
    <g id="layer-sky" transform={`translate(0, ${parallaxOffset * 0.1})`}>
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e4f1fb" />
          <stop offset="50%" stopColor="#edf6fc" />
          <stop offset="100%" stopColor="#f4f8fb" />
        </linearGradient>

        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#edf6fc" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background Atmosphere Rect */}
      <rect x="-400" y="-300" width="2200" height="900" fill="url(#skyGrad)" />

      {/* Polar Sun Glow */}
      <circle cx="1150" cy="140" r="280" fill="url(#sunGlow)" />
      <circle cx="1150" cy="140" r="45" fill="#ffffff" opacity="0.9" />
    </g>
  );
}
