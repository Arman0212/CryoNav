/* ═══════════════════════════════════════════════════════════════
   ImmersiveLanding — one continuous world, not a stack of sections.

   The WebGL canvas is fixed to the viewport and runs for the entire
   page. What actually scrolls is an empty tall spacer; that scroll
   position becomes mission time, and mission time drives the world.
   Narrative type and HUD float above the scene and cross-fade as the
   mission advances.
   ═══════════════════════════════════════════════════════════════ */

import React, { useEffect, Suspense } from 'react';
import { EnterTransitionProvider } from '@components/landing/EnterTransition';
import { MissionController } from './experience/MissionController';
import useScrollDriver from './experience/ScrollController';
import MissionHUD from './ui/MissionHUD';
import MissionText from './ui/MissionText';
import RouteAlert from './ui/RouteAlert';
import { PHASES } from './data/missionData';
import './immersive.css';

const AntarcticScene = React.lazy(() => import('./scene/AntarcticScene'));

/** Scroll length: enough room for each phase to breathe. */
const PAGE_VH = PHASES.length * 130;

export default function ImmersiveLanding({ quality = 'high' }) {
  const scrollRef = useScrollDriver();

  useEffect(() => {
    document.body.classList.add('landing-mode', 'immersive-mode');
    window.scrollTo(0, 0);
    return () => {
      document.body.classList.remove('landing-mode', 'immersive-mode');
      window.scrollTo(0, 0);
    };
  }, []);

  return (
    <EnterTransitionProvider>
      <MissionController scrollRef={scrollRef}>
        <div className="lp3-root">
          {/* The world — pinned, always running */}
          <div className="lp3-stage">
            <Suspense fallback={<div className="lp3-stage-fallback" />}>
              <AntarcticScene quality={quality} />
            </Suspense>
            <div className="lp3-vignette" />
          </div>

          {/* Everything layered over the world */}
          <MissionHUD />
          <MissionText />
          <RouteAlert />

          <div className="lp3-scroll-cue">
            <span>Scroll to run the mission</span>
            <span className="lp3-scroll-line" />
          </div>

          {/* The scroll surface itself — deliberately empty */}
          <div className="lp3-spacer" style={{ height: `${PAGE_VH}vh` }} aria-hidden="true" />
        </div>
      </MissionController>
    </EnterTransitionProvider>
  );
}
