/* SectionShell — consistent section frame: id anchor, numbered eyebrow,
   and a max-width inner container. Keeps all 15 sections visually aligned. */
import React from 'react';
import SectionReveal from './SectionReveal';

export default function SectionShell({ id, num, label, children, className = '' }) {
  return (
    <section id={id} className={`lp-section ${className}`}>
      <div className="lp-section-inner">
        {(num || label) && (
          <SectionReveal from="fade">
            <div className="lp-eyebrow">
              {num && <span className="lp-eyebrow-num">{num}</span>}
              <span className="lp-eyebrow-rule" />
              {label && <span className="lp-eyebrow-text">{label}</span>}
            </div>
          </SectionReveal>
        )}
        {children}
      </div>
    </section>
  );
}
