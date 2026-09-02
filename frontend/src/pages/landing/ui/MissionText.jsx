/* MissionText — the editorial layer floating over the world.

   Large type, one statement at a time, cross-fading as the mission moves
   between phases. Driven only by the phase index, so it re-renders nine
   times across the entire page rather than every frame.

   The closing phase resolves into the CryoNav wordmark and the way into
   the live application. */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PHASES } from '../data/missionData';
import { useMission } from '../experience/MissionController';
import { useEnterCryoNav } from '@components/landing/EnterTransition';

export default function MissionText() {
  const { phaseIndex } = useMission();
  const enterCryoNav = useEnterCryoNav();
  const phase = PHASES[phaseIndex];

  if (phase.isFinal) {
    return (
      <div className="lp3-narrative lp3-narrative-final" key={phase.id}>
        <div className="lp3-phase">
          <h2 className="lp3-title lp3-title-final">
            {phase.lines.map((line, i) => (
              <span key={line} className="lp3-title-line" style={{ animationDelay: `${i * 110}ms` }}>
                {line}
              </span>
            ))}
          </h2>

          <div className="lp3-wordmark">CryoNav</div>
          <p className="lp3-body lp3-body-center">{phase.sub}</p>

          <div className="lp3-final-actions">
            <button type="button" className="lp3-btn" onClick={enterCryoNav}>
              Enter CryoNav <ArrowRight size={16} />
            </button>
          </div>
          <div className="lp3-final-note">Opens the live navigation console</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp3-narrative" key={phase.id}>
      <div className="lp3-phase">
        <div className="lp3-phase-eyebrow">
          <span className="lp3-phase-num">{phase.num}</span>
          <span className="lp3-phase-rule" />
          <span>{phase.label}</span>
        </div>

        <h2 className="lp3-title">
          {phase.lines.map((line, i) => (
            <span key={line} className="lp3-title-line" style={{ animationDelay: `${i * 110}ms` }}>
              {line}
            </span>
          ))}
        </h2>

        <p className="lp3-body">{phase.sub}</p>
      </div>
    </div>
  );
}
