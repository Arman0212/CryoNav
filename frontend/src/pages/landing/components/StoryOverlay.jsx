/* ═══════════════════════════════════════════════════════════════
   StoryOverlay.jsx — Pinned Large Editorial Typography Transitions
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { STORY_STAGES } from '../animation/missionTimeline';

export default function StoryOverlay({ progress = 0 }) {
  const navigate = useNavigate();

  // Determine active story stage
  const currentStage = STORY_STAGES.find(
    (stage) => progress >= stage.range[0] && progress <= stage.range[1]
  );

  return (
    <div className="story-overlay-layer">
      {currentStage && (
        <div key={currentStage.id} className="story-text-card animate-fadeInUp">
          <h2 className="story-headline">{currentStage.headline}</h2>
          <p className="story-subheadline">{currentStage.subheadline}</p>

          {/* Final Scene CTA Button */}
          {currentStage.isFinal && (
            <div className="final-cta-container">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-enter-cryonav"
                aria-label="Enter CryoNav Application"
              >
                <span>ENTER CRYONAV</span>
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
