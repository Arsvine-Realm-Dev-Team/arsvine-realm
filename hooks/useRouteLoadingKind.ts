import { useEffect, useState } from 'react';
import type { NextRouter } from 'next/router';

export type RouteLoadingKind = null | 'tweets' | 'blog';

const TWEETS_ROUTE_RE = /^\/[A-Za-z-]+\/tweets\/?$/;
const BLOG_DETAIL_ROUTE_RE = /^\/[A-Za-z-]+\/blog\/[^/]+\/?$/;

export default function useRouteLoadingKind(router: Pick<NextRouter, 'events'>) {
  const [routeLoadingKind, setRouteLoadingKind] = useState<RouteLoadingKind>(null);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      const path = url.split('?')[0]?.split('#')[0] ?? url;

      if (TWEETS_ROUTE_RE.test(path)) {
        setRouteLoadingKind('tweets');
        return;
      }

      if (BLOG_DETAIL_ROUTE_RE.test(path)) {
        setRouteLoadingKind('blog');
        return;
      }

      setRouteLoadingKind(null);
    };

    const clearRouteLoading = () => {
      setRouteLoadingKind(null);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', clearRouteLoading);
    router.events.on('routeChangeError', clearRouteLoading);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', clearRouteLoading);
      router.events.off('routeChangeError', clearRouteLoading);
    };
  }, [router.events]);

  return routeLoadingKind;
}
