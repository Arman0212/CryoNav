/* useInView — IntersectionObserver visibility hook for scroll reveals.
   Deliberately dependency-free and cheap: one observer per element, no
   scroll listeners, disconnects itself once triggered when `once` is set. */
import { useEffect, useRef, useState } from 'react';

/**
 * @param {Object} [options]
 * @param {number} [options.threshold=0.15] - Visibility ratio to trigger at
 * @param {string} [options.rootMargin='0px 0px -10% 0px'] - Trigger slightly before full entry
 * @param {boolean} [options.once=true] - Stop observing after first reveal
 * @returns {[React.RefObject, boolean]} [ref, isInView]
 */
export function useInView({ threshold = 0.15, rootMargin = '0px 0px -10% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // No IntersectionObserver (very old browsers) → show content rather than hide it
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

export default useInView;
