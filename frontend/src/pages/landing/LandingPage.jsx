/* ═══════════════════════════════════════════════════════════════
   LandingPage — capability gate.

   WebGL-capable hardware gets the immersive Antarctic world. Everyone
   else — locked-down machines, old drivers, blocklisted GPUs, and anyone
   asking for reduced motion — gets the editorial telling of the same
   story instead of a blank canvas.

   Only the branch that actually renders is downloaded: the three.js
   bundle never reaches a visitor who can't use it, and never reaches the
   dashboard at all.
   ═══════════════════════════════════════════════════════════════ */

import React, { Suspense, useMemo } from 'react';
import useWebGLSupport from './hooks/useWebGLSupport';
import { useReducedMotion } from '@hooks/useReducedMotion';

const ImmersiveLanding = React.lazy(() => import('./ImmersiveLanding'));
const EditorialLanding = React.lazy(() => import('./EditorialLanding'));

/** Rough capability tier — decides scene detail before anything renders. */
function useQualityTier() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'high';
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const narrow = typeof window !== 'undefined' && window.innerWidth < 900;
    const coarse = typeof window !== 'undefined'
      && window.matchMedia?.('(pointer: coarse)').matches;
    if (narrow || coarse || cores <= 4 || mem <= 4) return 'low';
    if (cores <= 8 || mem <= 8) return 'medium';
    return 'high';
  }, []);
}

function Booting() {
  return <div className="lp3-boot" aria-label="Loading the Antarctic scene" />;
}

export default function LandingPage() {
  const webgl = useWebGLSupport();
  const reduced = useReducedMotion();
  const quality = useQualityTier();

  // Still probing for a WebGL context — hold a plain ice-coloured field
  if (webgl === null) return <Booting />;

  const immersive = webgl && !reduced;

  return (
    <Suspense fallback={<Booting />}>
      {immersive ? <ImmersiveLanding quality={quality} /> : <EditorialLanding />}
    </Suspense>
  );
}
