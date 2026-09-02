/* SECTION 01 — HERO
   Full-viewport opening. The visual is an abstract polar-stereographic
   plot of the actual CryoNav domain (20°W–120°E, 50°S–78°S per
   config/domain.yaml) with a route arc drawing itself in. */
import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import SectionReveal from '@components/landing/SectionReveal';
import { useEnterCryoNav } from '@components/landing/EnterTransition';

export default function Hero() {
  const enterCryoNav = useEnterCryoNav();

  const explore = () => {
    const el = document.getElementById('mission');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <header className="lp-hero">
      <div className="lp-hero-grid">
        <div>
          <SectionReveal from="fade">
            <div className="lp-telemetry" style={{ marginBottom: 'var(--space-6)' }}>
              <span className="lp-telemetry-item"><span className="lp-status-dot" /> System Online</span>
              <span className="lp-telemetry-item">MoES · NCPOR · PS 26059</span>
            </div>
          </SectionReveal>

          <h1 className="lp-hero-title">
            <SectionReveal from="up" as="span" style={{ display: 'block' }}>
              <span className="lp-hero-title-lead lp-gradient-text">CRYONAV</span>
            </SectionReveal>
            <SectionReveal from="up" delay={120} as="span" style={{ display: 'block' }}>
              <span className="lp-hero-sub">
                Antarctic Intelligence<br />for the Next Frontier
              </span>
            </SectionReveal>
          </h1>

          <SectionReveal from="up" delay={220}>
            <p className="lp-lede">
              AI-powered sea-ice forecasting, iceberg trajectory prediction, and safe
              navigation decision support for the Southern Ocean.
            </p>
          </SectionReveal>

          <SectionReveal from="up" delay={320}>
            <div className="lp-hero-actions">
              <button type="button" className="lp-btn lp-btn-primary" onClick={enterCryoNav}>
                Enter CryoNav <ArrowRight size={15} />
              </button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={explore}>
                Explore the System
              </button>
            </div>
          </SectionReveal>

          <SectionReveal from="fade" delay={420}>
            <div className="lp-hero-meta lp-telemetry">
              <span className="lp-telemetry-item">DOMAIN <span style={{ color: 'var(--lp-steel)' }}>20°W – 120°E</span></span>
              <span className="lp-telemetry-item">LAT <span style={{ color: 'var(--lp-steel)' }}>50°S – 78°S</span></span>
              <span className="lp-telemetry-item">GRID <span style={{ color: 'var(--lp-steel)' }}>25 km · EPSG:3412</span></span>
              <span className="lp-telemetry-item">HORIZON <span style={{ color: 'var(--lp-steel)' }}>1–14 D</span></span>
            </div>
          </SectionReveal>
        </div>

        <SectionReveal from="scale" delay={200} className="lp-hero-visual">
          <figure className="lp-photo lp-framed">
            <img
              src="/landing/ship-oden.jpg"
              alt="An icebreaker working through Antarctic pack ice, with the Transantarctic mountains behind"
              loading="eager"
              width="1920"
              height="1440"
            />
            <div className="lp-photo-ticks lp-mono">
              <span>77.8°S 166.7°E</span>
              <span>PACK ICE · SUMMER</span>
            </div>
          </figure>
        </SectionReveal>
      </div>

      <div className="lp-scroll-cue" aria-hidden="true">
        <span className="lp-mono">Scroll</span>
        <span className="lp-scroll-cue-line" />
        <ChevronDown size={13} />
      </div>
    </header>
  );
}
