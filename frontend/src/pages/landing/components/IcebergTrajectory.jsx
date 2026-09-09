/* ═══════════════════════════════════════════════════════════════
   IcebergTrajectory.jsx — RK4 Vector Trajectory & Uncertainty Cone
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { rangeFactor } from '../animation/missionTimeline';

export default function IcebergTrajectory({ progress = 0 }) {
  // Trajectory draws progressively starting at 43% progress
  if (progress < 0.40) return null;

  const drawFactor = rangeFactor(progress, 0.40, 0.65);
  const opacity = Math.min(1, drawFactor * 1.5);
  const strokeDash = 600 * (1 - drawFactor);

  return (
    <g id="layer-iceberg-trajectory" opacity={opacity}>
      {/* Uncertainty Cone Area */}
      <polygon
        points="960,160 520,360 480,520 620,440"
        fill="#fecaca"
        opacity={0.25 * drawFactor}
      />

      {/* Main Drift Path Line */}
      <path
        d="M 960,160 L 780,260 L 640,350 L 520,440"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2.5"
        strokeDasharray="6,6"
        style={{ strokeDashoffset: strokeDash }}
      />

      {/* Predicted Future Position Waypoint Dots */}
      <g fill="#ef4444" opacity={drawFactor}>
        <circle cx="780" cy="260" r="4" />
        <text x="795" y="265" fontSize="10" fontWeight="700" fill="#dc2626" fontFamily="JetBrains Mono, monospace">
          T+6H
        </text>

        <circle cx="640" cy="350" r="5" />
        <text x="655" y="355" fontSize="10" fontWeight="700" fill="#dc2626" fontFamily="JetBrains Mono, monospace">
          T+12H [RISK INTERSECTION]
        </text>

        <circle cx="520" cy="440" r="4" />
        <text x="535" y="445" fontSize="10" fontWeight="700" fill="#dc2626" fontFamily="JetBrains Mono, monospace">
          T+24H
        </text>
      </g>
    </g>
  );
}
