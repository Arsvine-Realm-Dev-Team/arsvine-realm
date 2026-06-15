import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

import type { BlogPostMeta, TranslationStatus } from '../types';
import { type Locale } from '../i18n/config';
import type { BlogContentLocale } from '../lib/blog';

export const blogContentLocaleLabels: Record<BlogContentLocale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'English',
  ja: '日本語',
  ru: 'Русский',
  fr: 'Français',
};

export function isBlogContentLocale(value: unknown): value is BlogContentLocale {
  return typeof value === 'string' && value in blogContentLocaleLabels;
}

export interface BlogVariantPayload {
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
}

interface UseBlogPostStateOptions {
  routerAsPath: string;
  locale: Locale;
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult | null;
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: { mode: string; group?: string };
  isProtected: boolean;
}

function getRequestedContentLocaleFromPath(asPath: string): BlogContentLocale | null {
  const query = asPath.split('?')[1]?.split('#')[0];
  if (!query) {
    return null;
  }

  const lang = new URLSearchParams(query).get('lang');
  return lang && isBlogContentLocale(lang) ? lang : null;
}

function resolveDefaultContentLocale(
  pageLocale: Locale,
  availableLocales: BlogContentLocale[],
  fallbackLocale: BlogContentLocale,
): BlogContentLocale {
  if (availableLocales.includes(pageLocale)) {
    return pageLocale;
  }
  return fallbackLocale;
}

function buildProtectedPostApiPath(locale: BlogContentLocale, slug: string) {
  const search = new URLSearchParams({
    locale,
    slug,
  });
  return `/api/post-variant?${search.toString()}`;
}

function writeContentLocaleQuery(nextContentLocale: BlogContentLocale) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('lang', nextContentLocale);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function buildBlogPostHref(
  locale: Locale,
  slug: string,
  contentLocale: BlogContentLocale,
) {
  return `/${locale}/blog/${slug}?lang=${encodeURIComponent(contentLocale)}`;
}

export default function useBlogPostState({
  routerAsPath,
  locale,
  meta,
  mdxSource,
  translationStatus,
  actualLocale,
  actualContentLocale,
  availableContentLocales,
  contentVariants,
  access,
  isProtected,
}: UseBlogPostStateOptions) {
  const defaultContentLocale = useMemo(
    () => resolveDefaultContentLocale(locale, availableContentLocales, actualContentLocale),
    [actualContentLocale, availableContentLocales, locale],
  );
  const [requestedContentLocale, setRequestedContentLocale] = useState<BlogContentLocale>(
    () => getRequestedContentLocaleFromPath(routerAsPath) ?? defaultContentLocale,
  );
  const [authState, setAuthState] = useState<'checking' | 'required' | 'granted'>(
    !isProtected || access.mode === 'public' ? 'granted' : 'checking',
  );
  const [lazyVariants, setLazyVariants] = useState<Partial<Record<BlogContentLocale, BlogVariantPayload>>>({});
  const [loadingLang, setLoadingLang] = useState<BlogContentLocale | null>(null);
  const [selectedContentLocale, setSelectedContentLocale] = useState<BlogContentLocale>(actualContentLocale);
  const [loadError, setLoadError] = useState('');

  const allVariants = useMemo(
    () => ({ ...contentVariants, ...lazyVariants }),
    [contentVariants, lazyVariants],
  );
  const baseVariant = useMemo(
    () => (mdxSource ? { meta, mdxSource } : null),
    [mdxSource, meta],
  );
  const selectedVariant = allVariants[selectedContentLocale] ?? baseVariant;
  const suppressFallbackBanner =
    selectedContentLocale !== actualContentLocale || requestedContentLocale !== actualContentLocale;
  const effectiveStatus: TranslationStatus = suppressFallbackBanner ? 'source' : translationStatus;
  const effectiveOriginLocale: Locale = ((selectedVariant?.meta.originLocale)
    ?? meta.originLocale
    ?? actualLocale) as Locale;

  const updateContentLocaleQuery = useCallback((nextContentLocale: BlogContentLocale) => {
    if (typeof window === 'undefined') {
      return;
    }

    setRequestedContentLocale(nextContentLocale);
    writeContentLocaleQuery(nextContentLocale);
  }, []);

  const markAuthGranted = useCallback(() => {
    setAuthState('granted');
  }, []);

  const loadVariant = useCallback(async (nextContentLocale: BlogContentLocale) => {
    setLoadingLang(nextContentLocale);
    setLoadError('');

    try {
      const response = await fetch(buildProtectedPostApiPath(nextContentLocale, meta.slug));
      const data = (await response.json()) as BlogVariantPayload | { error?: string };

      if (!response.ok || !('meta' in data) || !('mdxSource' in data)) {
        if (response.status === 403) {
          setAuthState('required');
          return null;
        }
        throw new Error('failed_to_load_variant');
      }

      setLazyVariants((prev) => ({ ...prev, [nextContentLocale]: data }));
      return data;
    } catch {
      setLoadError('Unable to load article content.');
      return null;
    } finally {
      setLoadingLang((current) => (current === nextContentLocale ? null : current));
    }
  }, [meta.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- slug/query 切换时必须同步重置当前文章语言与缓存态，避免上一文章的局部状态泄漏
    setRequestedContentLocale(getRequestedContentLocaleFromPath(routerAsPath) ?? defaultContentLocale);
    setLazyVariants({});
    setLoadingLang(null);
    setLoadError('');
    setSelectedContentLocale(actualContentLocale);
    setAuthState(!isProtected || access.mode === 'public' ? 'granted' : 'checking');
  }, [access.mode, actualContentLocale, defaultContentLocale, isProtected, routerAsPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentLang = getRequestedContentLocaleFromPath(window.location.href);
    if (currentLang === requestedContentLocale) {
      return;
    }

    writeContentLocaleQuery(requestedContentLocale);
  }, [requestedContentLocale]);

  useEffect(() => {
    if (!isProtected || access.mode === 'public' || !access.group) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 公开文章必须在进入 effect 时立即越过受保护态，避免短暂显示错误 gate
      setAuthState('granted');
      return;
    }

    let cancelled = false;

    fetch(`/api/grant-check?group=${encodeURIComponent(access.group)}`)
      .then((response) => response.json())
      .then((data: { ok: boolean; granted: boolean }) => {
        if (cancelled) {
          return;
        }
        setAuthState(data.granted ? 'granted' : 'required');
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState('required');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [access.group, access.mode, isProtected]);

  useEffect(() => {
    if (authState !== 'granted') {
      return;
    }

    const targetContentLocale = requestedContentLocale;
    const hasBaseVariantForSelected = Boolean(
      baseVariant && selectedContentLocale === actualContentLocale,
    );

    if (targetContentLocale !== selectedContentLocale) {
      if (loadingLang === targetContentLocale) {
        return;
      }

      if (allVariants[targetContentLocale]) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 目标语言已在缓存中时，立即切换显示可避免重复加载与空白态
        setSelectedContentLocale(targetContentLocale);
        return;
      }

      void loadVariant(targetContentLocale).then((payload) => {
        if (payload) {
          setSelectedContentLocale(targetContentLocale);
        }
      });
      return;
    }

    if (hasBaseVariantForSelected || allVariants[selectedContentLocale]) {
      return;
    }
    if (loadingLang === selectedContentLocale) {
      return;
    }

    void loadVariant(selectedContentLocale);
  }, [
    actualContentLocale,
    allVariants,
    authState,
    baseVariant,
    loadVariant,
    loadingLang,
    requestedContentLocale,
    selectedContentLocale,
  ]);

  return {
    defaultContentLocale,
    requestedContentLocale,
    authState,
    selectedVariant,
    selectedContentLocale,
    loadingLang,
    loadError,
    effectiveStatus,
    effectiveOriginLocale,
    updateContentLocaleQuery,
    markAuthGranted,
    setSelectedContentLocale,
  };
}
