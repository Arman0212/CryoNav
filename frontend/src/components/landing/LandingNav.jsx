/* LandingNav — minimal floating navigation.
   Tracks the active section with a single IntersectionObserver over all
   section anchors (not a scroll listener), and routes "ENTER APP" to the
   real existing dashboard at /dashboard. */
import React, { useEffect, useState, useCallback } from 'react';
import { Snowflake, ArrowRight } from 'lucide-react';
import { useEnterCryoNav } from './EnterTransition';

const NAV_ITEMS = [
  { num: '01', label: 'Mission', target: 'mission' },
  { num: '02', label: 'Intelligence', target: 'intelligence' },
  { num: '03', label: 'Routing', target: 'routing' },
  { num: '04', label: 'Technology', target: 'technology' },
];

export default function LandingNav() {
  const enterCryoNav = useEnterCryoNav();
  const [active, setActive] = useState('mission');

  useEffect(() => {
    const targets = NAV_ITEMS
      .map((item) => document.getElementById(item.target))
      .filter(Boolean);
    if (!targets.length || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return (
    <nav className="lp-nav" aria-label="Landing page sections">
      <div className="lp-nav-brand">
        <span className="lp-nav-brand-mark"><Snowflake size={16} /></span>
        CRYONAV
      </div>

      <div className="lp-nav-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.target}
            type="button"
            className={`lp-nav-link ${active === item.target ? 'is-active' : ''}`}
            onClick={() => scrollTo(item.target)}
            aria-current={active === item.target ? 'true' : undefined}
          >
            <span className="lp-nav-link-num">{item.num}</span>
            {item.label}
          </button>
        ))}
      </div>

      <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={enterCryoNav}>
        Enter App <ArrowRight size={13} />
      </button>
    </nav>
  );
}
