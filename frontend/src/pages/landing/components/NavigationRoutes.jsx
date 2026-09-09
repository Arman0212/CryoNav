/* ═══════════════════════════════════════════════════════════════
   NavigationRoutes.jsx — Original Corridor & CryoNav Safe Route
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { rangeFactor } from '../animation/missionTimeline';

export default function NavigationRoutes({ progress = 0 }) {
  const originalOpacity = progress > 0.72 ? Math.max(0.15, 1 - (progress - 0.72) * 4) : 0.85;
  const isDanger = progress >= 0.55;

  const safeDraw = rangeFactor(progress, 0.70, 0.84);
  const safeOpacity = Math.min(1, safeDraw * 1.5);
  const safeDash = 800 * (1 - safeDraw);

  return (
    <g id="layer-navigation-routes">
      {/* ── Original Planned Corridor ── */}
      <g opacity={originalOpacity}>
        <path
          d="M 160,580 L 580,390 L 720,330 L 920,240 L 1260,180"
          fill="none"
          stroke={isDanger ? '#ef4444' : '#f97316'}
          strokeWidth={isDanger ? '3.5' : '2.5'}
          strokeDasharray={isDanger ? '8,4' : '6,4'}
        />
        <circle cx="1260" cy="180" r="6" fill="#f97316" />
        <text x="1275" y="185" fontSize="11" fontWeight="700" fill="#c2410c" fontFamily="JetBrains Mono, monospace">
          PLANNED CORRIDOR [ORIGINAL]
        </text>

        {isDanger && (
          <g transform="translate(680, 340)">
            <circle cx="0" cy="0" r="14" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" className="pulse-target-ring" />
            <text x="20" y="4" fontSize="11" fontWeight="800" fill="#dc2626" fontFamily="JetBrains Mono, monospace">
              ⚠️ PREDICTED INTERSECTION
            </text>
          </g>
        )}
      </g>

      {/* ── CryoNav Calculated Safe Route (Arctic Cyan) ── */}
      {progress >= 0.68 && (
        <g opacity={safeOpacity}>
          <path
            d="M 580,390 Q 640,460 720,470 Q 920,530 1260,410"
            fill="none"
            stroke="#0284c7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="800"
            style={{ strokeDashoffset: safeDash }}
          />

          {safeDraw > 0.3 && (
            <g transform="translate(580, 390)">
              <circle cx="0" cy="0" r="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="-15" y="-12" fontSize="10" fontWeight="700" fill="#0369a1" fontFamily="JetBrains Mono, monospace">
                WP-1 [STARBOARD TURN]
              </text>
            </g>
          )}

          {safeDraw > 0.6 && (
            <g transform="translate(720, 470)">
              <circle cx="0" cy="0" r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <circle cx="0" cy="0" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="pulse-target-ring" />
              <text x="12" y="16" fontSize="10" fontWeight="700" fill="#0369a1" fontFamily="JetBrains Mono, monospace">
                WP-2 [CLEAR HAZARD]
              </text>
            </g>
          )}

          {safeDraw > 0.9 && (
            <g transform="translate(1260, 410)">
              <circle cx="0" cy="0" r="8" fill="#059669" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="4" fontSize="11" fontWeight="800" fill="#047857" fontFamily="JetBrains Mono, monospace">
                SAFE DESTINATION [BHARATI / MAITRI]
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
}
