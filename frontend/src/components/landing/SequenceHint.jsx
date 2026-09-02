/* SequenceHint — shown while a section is holding the page still.
   Tells the reader why scrolling paused, how far along it is, and how to
   skip. A locked page without an explanation is just a broken page. */
import React from 'react';

export default function SequenceHint({ active, progress, label = 'Playing sequence' }) {
  if (!active) return null;

  return (
    <div className="lp-seq-hint lp-mono" role="status" aria-live="polite">
      <span>{label}</span>
      <span className="lp-seq-hint-track">
        <span className="lp-seq-hint-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
      <span className="lp-dim">Esc to skip</span>
    </div>
  );
}
