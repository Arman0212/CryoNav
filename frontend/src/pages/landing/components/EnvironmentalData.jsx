/* ═══════════════════════════════════════════════════════════════
   EnvironmentalData.jsx — Wind Barbs & Ocean Current Indicators
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function EnvironmentalData({ progress = 0 }) {
  // Appears during environmental observation phase (0.15+)
  if (progress < 0.12) return null;

  const opacity = Math.min(1, (progress - 0.12) * 5);

  return (
    <g id="layer-environmental-data" opacity={opacity * 0.75}>
      {/* Wind Vectors (Top Right Field) */}
      <g transform="translate(1050, 420)" stroke="#0284c7" strokeWidth="1.5">
        <line x1="0" y1="0" x2="-40" y2="20" />
        <line x1="-40" y1="20" x2="-35" y2="10" />
        <line x1="-30" y1="15" x2="-25" y2="5" />
        <text x="-45" y="38" fontSize="9" fontWeight="700" fill="#0369a1" stroke="none" fontFamily="JetBrains Mono, monospace">
          WIND 18 KT 240°
        </text>
      </g>

      {/* Ocean Current Vectors (Bottom Field) */}
      <g transform="translate(420, 680)" stroke="#0ecdb9" strokeWidth="1.5">
        <line x1="0" y1="0" x2="35" y2="-15" />
        <polygon points="35,-15 25,-18 28,-8" fill="#0ecdb9" stroke="none" />
        <text x="-10" y="20" fontSize="9" fontWeight="700" fill="#0d9488" stroke="none" fontFamily="JetBrains Mono, monospace">
          CURRENT 1.2 KT 045°
        </text>
      </g>
    </g>
  );
}
