/* ═══════════════════════════════════════════════════════════════
   AntarcticSvgScene.jsx — Master Antarctic Vector SVG Environment
   Composition of all 16 separate vector components with camera zoom/pan
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import Sky from './Sky';
import Clouds from './Clouds';
import Mountains from './Mountains';
import IceShelf from './IceShelf';
import Ocean from './Ocean';
import SeaIce from './SeaIce';
import Iceberg from './Iceberg';
import IcebergTrajectory from './IcebergTrajectory';
import NavigationRoutes from './NavigationRoutes';
import ResearchVessel from './ResearchVessel';
import DetectionMarker from './DetectionMarker';
import EnvironmentalData from './EnvironmentalData';
import { getCameraState } from '../animation/missionTimeline';

export default function AntarcticSvgScene({ progress = 0 }) {
  const { cx, cy, scale } = getCameraState(progress);

  return (
    <svg
      className="antarctic-svg-canvas"
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Camera Group (Zoom & Pan Transform) ── */}
      <g
        className="camera-g"
        transform={`translate(${cx}, ${cy}) scale(${scale})`}
        style={{ transition: 'transform 0.1s linear' }}
      >
        {/* Layer 1: Sky & Atmospheric Atmosphere */}
        <Sky parallaxOffset={cx} />

        {/* Layer 2: Drifting Vector Clouds */}
        <Clouds progress={progress} />

        {/* Layer 3: Antarctic Mountain Ridges & Peaks */}
        <Mountains progress={progress} />

        {/* Layer 4: Coastal Ice Shelf & Glacier Cliffs */}
        <IceShelf />

        {/* Layer 5: Antarctic Ocean Surface & Waves */}
        <Ocean />

        {/* Layer 6: Sea-Ice Floes & Coordinate Grid Lines */}
        <SeaIce />

        {/* Layer 7: RK4 Iceberg Drift Trajectory & Uncertainty Cone */}
        <IcebergTrajectory progress={progress} />

        {/* Layer 8: Original & Safe Navigation Routes */}
        <NavigationRoutes progress={progress} />

        {/* Layer 9: Detailed Multi-Faceted Iceberg */}
        <Iceberg progress={progress} />

        {/* Layer 10: Iceberg Target Detection Marker */}
        <DetectionMarker progress={progress} />

        {/* Layer 11: Environmental Sensors (Wind & Current) */}
        <EnvironmentalData progress={progress} />

        {/* Layer 12: Antarctic Research Vessel */}
        <ResearchVessel progress={progress} />
      </g>
    </svg>
  );
}
