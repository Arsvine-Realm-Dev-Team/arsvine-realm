'use client';

import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/compat/router';

import { NavigationRuntimeProvider } from './NavigationRuntime';

export function PagesNavigationRuntime({ children }: { children: ReactNode }) {
  const router = useRouter();
  const value = useMemo(() => {
    if (!router) {
      throw new Error('PagesNavigationRuntime requires the Pages Router.');
    }
    return {
      pathname: router.pathname,
      asPath: router.asPath,
      query: Object.fromEntries(Object.entries(router.query).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : value?.[0],
      ])),
      push: async (href: string, options?: { scroll?: boolean }) => {
        await router.push(href, undefined, { scroll: options?.scroll });
      },
      prefetch: async (href: string) => { await router.prefetch(href); },
    };
  }, [router]);

  return <NavigationRuntimeProvider value={value}>{children}</NavigationRuntimeProvider>;
}
