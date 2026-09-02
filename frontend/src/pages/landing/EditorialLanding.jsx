/* ═══════════════════════════════════════════════════════════════
   EditorialLanding — the no-WebGL fallback.

   The scroll-driven editorial telling of the same story, served to
   visitors whose browser or hardware cannot run the WebGL experience
   (and to anyone who asks for reduced motion).

   Renders OUTSIDE the app's <Layout> shell (no sidebar/topbar) and
   temporarily unlocks document scrolling, which the dashboard shell
   otherwise keeps disabled (body{overflow:hidden}). Both the class and
   the scroll position are restored on unmount, so entering the app
   leaves the dashboard exactly as it was.
   ═══════════════════════════════════════════════════════════════ */

import React, { useEffect } from 'react';
import AntarcticBackground from '@components/landing/AntarcticBackground';
import LandingNav from '@components/landing/LandingNav';
import ScrollProgress from '@components/landing/ScrollProgress';
import { EnterTransitionProvider } from '@components/landing/EnterTransition';

import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Pipeline from './sections/Pipeline';
import SeaIce from './sections/SeaIce';
import Icebergs from './sections/Icebergs';
import Vessel from './sections/Vessel';
import Risk from './sections/Risk';
import Routing from './sections/Routing';
import Rerouting from './sections/Rerouting';
import DigitalTwin from './sections/DigitalTwin';
import DecisionEngine from './sections/DecisionEngine';
import Copilot from './sections/Copilot';
import Technology from './sections/Technology';
import Credibility from './sections/Credibility';
import FinalCTA from './sections/FinalCTA';

import './landing.css';

export default function EditorialLanding() {
  useEffect(() => {
    document.body.classList.add('landing-mode');
    window.scrollTo(0, 0);
    return () => {
      document.body.classList.remove('landing-mode');
      window.scrollTo(0, 0);
    };
  }, []);

  return (
    <EnterTransitionProvider>
      <div className="lp-root">
        <AntarcticBackground />
        <ScrollProgress />
        <LandingNav />

        <main className="lp-content">
        <Hero />
        <Problem />
        <Pipeline />
        <SeaIce />
        <Icebergs />
        <Vessel />
        <Risk />
        <Routing />
        <Rerouting />
        <DigitalTwin />
        <DecisionEngine />
        <Copilot />
        <Technology />
          <Credibility />
          <FinalCTA />
        </main>
      </div>
    </EnterTransitionProvider>
  );
}
