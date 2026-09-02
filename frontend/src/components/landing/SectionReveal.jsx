/* SectionReveal — the single animation primitive for the landing page.
   Wraps children in a transform/opacity reveal driven by IntersectionObserver.
   Everything animates via compositor-friendly properties only. */
import React from 'react';
import { useInView } from '@hooks/useInView';

/**
 * @param {Object} props
 * @param {'up'|'down'|'left'|'right'|'fade'|'scale'} [props.from='up'] - Entry direction
 * @param {number} [props.delay=0] - Stagger delay in ms
 * @param {string} [props.as='div'] - Element tag to render
 */
export default function SectionReveal({
  children, from = 'up', delay = 0, as: Tag = 'div', className = '', style, ...rest
}) {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`lp-reveal lp-reveal-${from} ${inView ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
