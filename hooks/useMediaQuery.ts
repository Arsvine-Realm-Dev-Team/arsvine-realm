import { useState, useEffect } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required: matchMedia's "change" event only fires on value changes, so this synchronous sync is needed to initialize matches for the new query
    if (mql.matches !== matches) setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}

export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return { isMobile, isTablet, isDesktop };
}

/**
 * prefers-reduced-motion: reduce 媒体查询。
 * 集中管理避免 7 处散落的 `matchMedia('(prefers-reduced-motion: reduce)')`。
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
