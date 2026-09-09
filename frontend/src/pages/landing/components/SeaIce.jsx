/* ═══════════════════════════════════════════════════════════════
   SeaIce.jsx — Floating Ice Floes & Geospatial Coordinate Grid
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

export default function SeaIce() {
  return (
    <g id="layer-sea-ice">
      {/* Geospatial Coordinate Grid Overlay (Light Arctic Style) */}
      <g stroke="#94c4e9" strokeWidth="0.8" strokeDasharray="6,8" opacity="0.35">
        <line x1="-200" y1="480" x2="1600" y2="480" />
        <line x1="-200" y1="560" x2="1600" y2="560" />
        <line x1="-200" y1="640" x2="1600" y2="640" />
        <line x1="-200" y1="720" x2="1600" y2="720" />
        
        <line x1="200" y1="360" x2="200" y2="850" />
        <line x1="450" y1="360" x2="450" y2="850" />
        <line x1="700" y1="360" x2="700" y2="850" />
        <line x1="950" y1="360" x2="950" y2="850" />
        <line x1="1200" y1="360" x2="1200" y2="850" />
      </g>

      {/* Floating Ice Floes (Polygons) */}
      <g fill="#ffffff" stroke="#c0dcf2" strokeWidth="1.5">
        {/* Floe 1 */}
        <polygon points="120,490 150,475 190,495 175,520 135,515" className="floating-ice-floe" />
        {/* Floe 2 */}
        <polygon points="340,540 380,530 410,555 390,580 350,570" className="floating-ice-floe" />
        {/* Floe 3 */}
        <polygon points="560,465 600,455 625,480 595,500 550,485" className="floating-ice-floe" />
        {/* Floe 4 */}
        <polygon points="820,530 860,515 895,540 870,565 830,555" className="floating-ice-floe" />
        {/* Floe 5 */}
        <polygon points="1050,480 1090,465 1125,490 1100,515 1060,505" className="floating-ice-floe" />
        {/* Floe 6 */}
        <polygon points="250,620 290,605 320,630 300,655 260,645" className="floating-ice-floe" />
        {/* Floe 7 */}
        <polygon points="740,640 780,625 815,650 790,675 750,665" className="floating-ice-floe" />
      </g>
    </g>
  );
}
