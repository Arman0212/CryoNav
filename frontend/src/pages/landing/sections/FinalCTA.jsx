/* SECTION 15 — FINAL CALL TO ACTION
   The page darkens and quiets. One route, one vessel, one door into the
   real application. */
import React from 'react';
import { ArrowRight } from 'lucide-react';
import SectionReveal from '@components/landing/SectionReveal';
import { useEnterCryoNav } from '@components/landing/EnterTransition';

export default function FinalCTA() {
  const enterCryoNav = useEnterCryoNav();

  return (
    <>
      <section className="lp-final">
        <SectionReveal from="fade">
          <svg viewBox="0 0 720 200" style={{ width: 'min(720px, 92vw)', height: 'auto', marginBottom: 'var(--space-10)' }}
            role="img" aria-label="A vessel following its route toward an Antarctic station">
            <defs>
              <linearGradient id="lp-final-route" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1668c9" stopOpacity="0.15" />
                <stop offset="60%" stopColor="#0b7fa8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0b7fa8" />
              </linearGradient>
            </defs>
            {/* Ice shelf silhouette */}
            <path d="M0 168 L96 150 L168 160 L262 138 L352 154 L448 132 L556 148 L640 130 L720 144 L720 200 L0 200 Z"
              fill="#cfe3f2" stroke="rgba(138,149,176,0.16)" />
            {/* Route */}
            <path className="lp-draw is-drawn" style={{ '--len': 700 }}
              d="M40 120 C 200 108, 380 86, 660 58"
              fill="none" stroke="url(#lp-final-route)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Vessel */}
            <g transform="translate(356 86)">
              <polygon points="0,-6 12,0 0,6 -3,0" fill="#0b7fa8" />
              <circle r="16" fill="none" stroke="#0b7fa8" strokeOpacity="0.3">
                <animate attributeName="r" values="14;30;14" dur="4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite" />
              </circle>
            </g>
            {/* Station */}
            <rect x="656" y="52" width="9" height="9" fill="#6d28d9" />
          </svg>
        </SectionReveal>

        <SectionReveal from="up" delay={100}>
          <h2 className="lp-display lp-final-title">
            The future of Antarctic navigation
            <span className="lp-gradient-text"> starts here.</span>
          </h2>
        </SectionReveal>

        <SectionReveal from="up" delay={220}>
          <button type="button" className="lp-btn lp-btn-primary" style={{ padding: 'var(--space-4) var(--space-10)', fontSize: 'var(--font-size-md)' }}
            onClick={enterCryoNav}>
            Enter CryoNav <ArrowRight size={17} />
          </button>
        </SectionReveal>

        <SectionReveal from="fade" delay={320}>
          <div className="lp-telemetry" style={{ justifyContent: 'center', marginTop: 'var(--space-8)' }}>
            <span className="lp-telemetry-item"><span className="lp-status-dot" /> Live system</span>
            <span className="lp-telemetry-item">Bharati · Maitri</span>
            <span className="lp-telemetry-item">Southern Ocean · Indian Sector</span>
          </div>
        </SectionReveal>
      </section>

      <footer className="lp-footer">
        <span className="lp-mono lp-dim">CryoNav · Antarctic Navigation Decision Support</span>
        <span className="lp-mono lp-dim">Smart India Hackathon · PS 26059 · MoES / NCPOR</span>
        <span className="lp-mono lp-dim">Research &amp; educational use</span>

        {/* Attribution is a licence condition for the CC-licensed photographs. */}
        <div className="lp-credits lp-mono">
          Photography:{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Swedish_icebreaker_Oden.jpg" target="_blank" rel="noreferrer noopener">
            Swedish icebreaker Oden
          </a>{' '}— Larry Larsson, U.S. Navy (public domain) ·{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Very_Large_Iceberg_and_Antarctic_Sea_2.jpg" target="_blank" rel="noreferrer noopener">
            Very Large Iceberg and Antarctic Sea
          </a>{' '}— Brignolo (CC BY 4.0) ·{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Antarctic_Sound-2016-Iceberg_02.jpg" target="_blank" rel="noreferrer noopener">
            Antarctic Sound Iceberg
          </a>{' '}— Godot13 (CC BY-SA 4.0) ·{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Antarctica_Oden_the_Ice_Breaker.jpg" target="_blank" rel="noreferrer noopener">
            Oden the Ice Breaker
          </a>{' '}— Eli Duke (CC BY-SA 2.0). Sourced via Wikimedia Commons.
        </div>
      </footer>
    </>
  );
}
