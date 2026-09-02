/* ═══════════════════════════════════════════════════════════════
   EnterTransition — the bright hand-off between the story and the app.

   Every "Enter CryoNav" control calls the same handler: a pale Antarctic
   scene (iceberg + vessel under a bright polar sky) covers the page while
   the dashboard chunk loads, then react-router navigates IN THE SAME TAB.
   ═══════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '@hooks/useReducedMotion';

const EnterContext = createContext(() => {});

/** Call this from any landing control to begin the hand-off. */
export function useEnterCryoNav() {
  return useContext(EnterContext);
}

const STATUS_LINES = [
  'Loading Antarctic data cube',
  'Initialising sea-ice fields',
  'Restoring vessel state',
  'Opening navigation console',
];

function EnterScene() {
  return (
    <div className="lp-enter-scene" aria-hidden="true">
      <img
        src="/landing/ship-oden.jpg"
        alt=""
        className="lp-enter-photo"
        width="1920"
        height="1440"
      />
      <div className="lp-enter-wash" />
    </div>
  );
}

export function EnterTransitionProvider({ children }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [entering, setEntering] = useState(false);
  const [line, setLine] = useState(0);

  const enter = useCallback(() => setEntering(true), []);

  useEffect(() => {
    if (!entering) return undefined;

    const total = reduced ? 400 : 2200;

    // Warm the dashboard chunk while the scene is on screen
    import('@pages/DashboardPage').catch(() => {});

    const stepMs = total / STATUS_LINES.length;
    const ticker = window.setInterval(() => {
      setLine((n) => Math.min(n + 1, STATUS_LINES.length - 1));
    }, stepMs);

    const done = window.setTimeout(() => navigate('/dashboard'), total);

    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(done);
    };
  }, [entering, navigate, reduced]);

  return (
    <EnterContext.Provider value={enter}>
      {children}
      {entering && (
        <div className="lp-enter" role="status" aria-live="polite">
          <EnterScene />
          <div className="lp-enter-panel">
            <div className="lp-enter-title">Entering CryoNav</div>
            <div className="lp-enter-bar"><span className="lp-enter-bar-fill" /></div>
            <div className="lp-enter-status">{STATUS_LINES[line]}…</div>
          </div>
        </div>
      )}
    </EnterContext.Provider>
  );
}

export default EnterTransitionProvider;
