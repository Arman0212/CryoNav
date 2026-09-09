/* ═══════════════════════════════════════════════════════════════
   DetectionMarker.jsx — Target Reticle for Detected Iceberg
   Renders genuine BERG_001 data from CryoNav backend snapshot
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { getIcebergState } from '../animation/missionTimeline';

export default function DetectionMarker({ progress = 0 }) {
  // Appears when iceberg is detected (0.28 to 0.75)
  if (progress < 0.28 || progress > 0.75) return null;

  const { x, y } = getIcebergState(progress);
  const opacity = Math.min(1, (progress - 0.28) * 10);

  return (
    <g id="layer-detection-marker" transform={`translate(${x}, ${y})`} opacity={opacity}>
      {/* Outer Pulsing Target Ring */}
      <circle cx="0" cy="0" r="70" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="8,4" className="pulse-target-ring" />
      <circle cx="0" cy="0" r="90" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />

      {/* Target Reticle Crosshairs */}
      <line x1="-100" y1="0" x2="-60" y2="0" stroke="#0284c7" strokeWidth="2" />
      <line x1="60" y1="0" x2="100" y2="0" stroke="#0284c7" strokeWidth="2" />
      <line x1="0" y1="-100" x2="0" y2="-60" stroke="#0284c7" strokeWidth="2" />
      <line x1="0" y1="60" x2="0" y2="100" stroke="#0284c7" strokeWidth="2" />

      {/* Target Info Badge */}
      <g transform="translate(75, -60)">
        <rect x="0" y="0" width="180" height="42" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
        <text x="10" y="15" fontSize="10" fontWeight="800" fill="#0f172a" fontFamily="JetBrains Mono, monospace">
          TARGET: BERG_001 [2.6 × 1.1 km]
        </text>
        <text x="10" y="30" fontSize="9" fontWeight="700" fill="#dc2626" fontFamily="JetBrains Mono, monospace">
          DRIFT: 045° SW · 10-MEMBER ENSEMBLE
        </text>
      </g>
    </g>
  );
}
