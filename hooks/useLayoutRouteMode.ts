import { useMemo } from 'react';
import type { NextRouter } from 'next/router';

export interface LayoutRouteMode {
  isHome: boolean;
  isContentPage: boolean;
  isStandalone: boolean;
  activeSection: 'home' | 'content';
}

export default function useLayoutRouteMode(
  router: NextRouter,
  forceHomeSection: boolean,
): LayoutRouteMode {
  return useMemo(() => {
    const isHome = router.pathname === '/[locale]';
    const isContentPage = router.pathname === '/[locale]/content';
    const isStandalone =
      router.pathname === '/[locale]/game'
      || router.pathname.startsWith('/[locale]/game/')
      || router.pathname.startsWith('/[locale]/web/')
      || router.pathname.startsWith('/[locale]/life/')
      || router.pathname.startsWith('/[locale]/blog/');

    return {
      isHome,
      isContentPage,
      isStandalone,
      activeSection: forceHomeSection || isHome ? 'home' : 'content',
    };
  }, [forceHomeSection, router.pathname]);
}
