/* ═══════════════════════════════════════════════════════════════
   Iceberg.jsx — Detailed Multi-Faceted Antarctic Iceberg Vector
   Crystalline ice facets, snow cap highlights, submerged base gradient,
   surrounding waterline foam, and floating ice fragments.
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { getIcebergState } from '../animation/missionTimeline';

export default function Iceberg({ progress = 0 }) {
  const { x, y, rotation } = getIcebergState(progress);

  return (
    <g id="layer-iceberg" transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <defs>
        {/* Underwater Submerged Bulk Shadow */}
        <radialGradient id="bergUnderwaterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3882c7" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#5ea2dc" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8cc2eb" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="facetLight1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>

        <linearGradient id="facetLight2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>

        <linearGradient id="facetMid1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="facetDark1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
      </defs>

      {/* ── Submerged Underwater Mass ── */}
      <ellipse cx="0" cy="48" rx="150" ry="85" fill="url(#bergUnderwaterGrad)" />
      <polygon points="-130,30 -70,120 60,140 125,45" fill="#3882c7" opacity="0.3" />

      {/* ── Visible Iceberg Body (Multi-Faceted Vector Geometry) ── */}
      <g stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
        {/* Shaded Rear Facets */}
        <polygon points="-100,0 -45,-85 0,-45 25,25 -65,30" fill="url(#facetDark1)" />
        <polygon points="0,-45 65,-120 120,-15 45,30" fill="url(#facetMid1)" />

        {/* Highlight Front Facets */}
        <polygon points="-120,15 -45,-85 0,-45 -25,30" fill="url(#facetLight2)" />
        <polygon points="-45,-85 25,-140 65,-120 0,-45" fill="url(#facetLight1)" />
        <polygon points="0,-45 65,-120 85,-35 25,30" fill="url(#facetLight2)" />
        <polygon points="85,-35 130,-15 110,25 25,30" fill="url(#facetMid1)" />

        {/* Pure Snow Cap Crest Highlights */}
        <polygon points="25,-140 12,-125 35,-120" fill="#ffffff" />
        <polygon points="65,-120 48,-102 75,-98" fill="#ffffff" />
        <polygon points="-45,-85 -55,-70 -35,-65" fill="#ffffff" />
      </g>

      {/* ── Waterline Foam & Ripples ── */}
      <ellipse cx="0" cy="22" rx="135" ry="20" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.75" />
      <ellipse cx="0" cy="22" rx="155" ry="26" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.45" />

      {/* ── Small Floating Ice Fragments ── */}
      <polygon points="-150,25 -140,20 -142,32" fill="#ffffff" stroke="#7dd3fc" strokeWidth="0.5" />
      <polygon points="145,18 155,12 152,26" fill="#ffffff" stroke="#7dd3fc" strokeWidth="0.5" />
    </g>
  );
}
