import { startTransition, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { BlogPostMeta, TranslationStatus } from '../types';
import { type Locale } from '../i18n/config';
import type { BlogContentLocale } from '../lib/blog';
import {
  blogPostStateReducer,
  createInitialBlogPostState,
  type BlogPostViewState,
} from '../lib/blog-post-state';
import {
  blogContentLocaleLabels,
  buildBlogPostHref,
  buildBlogVariantRequestKey,
  buildPostVariantApiPath,
  getRequestedContentLocaleFromPath,
  resolveDefaultContentLocale,
  type BlogVariantPayload,
} from '../lib/blog-client';
import type { GrantCheckResponse } from '../lib/content/access-api';

export { blogContentLocaleLabels, buildBlogPostHref };
export type { BlogVariantPayload, BlogPostViewState };

interface UseBlogPostStateOptions {
  routerAsPath: string;
  locale: Locale;
  meta: BlogPostMeta;
  mdxSource: BlogVariantPayload['mdxSource'] | null;
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: { mode: string; group?: string };
  isProtected: boolean;
  hydrationReady: boolean;
}

interface PostVariantErrorResponse {
  ok: false;
  code: 'METHOD_NOT_ALLOWED' | 'VALIDATION_FAILED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
  message: string;
}

interface PostVariantSuccessResponse extends BlogVariantPayload {
  ok: true;
}

type PostVariantResponse = PostVariantSuccessResponse | PostVariantErrorResponse;

interface UseBlogPostStateResult {
  defaultContentLocale: BlogContentLocale;
  requestedContentLocale: BlogContentLocale;
  selectedContentLocale: BlogContentLocale;
  selectedVariant: BlogVariantPayload | null;
  viewState: BlogPostViewState;
  loadingLang: BlogContentLocale | null;
  loadError: string;
  effectiveStatus: TranslationStatus;
  effectiveOriginLocale: Locale;
  updateContentLocaleQuery: (nextContentLocale: BlogContentLocale) => void;
  markAuthGranted: () => void;
  retryRequestedContentLocale: () => void;
}

function writeContentLocaleQuery(nextContentLocale: BlogContentLocale) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('lang', nextContentLocale);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function getVariantLoadErrorMessage(response: PostVariantErrorResponse | null) {
  if (!response) {
    return 'Unable to load article content.';
  }

  if (response.code === 'NOT_FOUND') {
    return 'Requested article locale is unavailable.';
  }

  if (response.code === 'VALIDATION_FAILED') {
    return 'Requested article locale is invalid.';
  }

  return response.message || 'Unable to load article content.';
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
  hydrationReady,
}: UseBlogPostStateOptions): UseBlogPostStateResult {
  const defaultContentLocale = useMemo(
    () => resolveDefaultContentLocale(locale, availableContentLocales, actualContentLocale),
    [actualContentLocale, availableContentLocales, locale],
  );
  const requiresAuth = isProtected && access.mode !== 'public';
  const initialRequestedContentLocale = getRequestedContentLocaleFromPath(routerAsPath) ?? defaultContentLocale;

  const [state, dispatch] = useReducer(
    blogPostStateReducer,
    {
      requestedContentLocale: initialRequestedContentLocale,
      actualContentLocale,
      requiresAuth,
    },
    createInitialBlogPostState,
  );
  const inflightRequestRef = useRef<AbortController | null>(null);

  const baseVariant = useMemo(
    () => (mdxSource ? { meta, mdxSource } : null),
    [mdxSource, meta],
  );

  const allVariants = useMemo(() => {
    const baseVariants = baseVariant
      ? { [actualContentLocale]: baseVariant }
      : {};

    return {
      ...contentVariants,
      ...state.lazyVariants,
      ...baseVariants,
    } as Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  }, [actualContentLocale, baseVariant, contentVariants, state.lazyVariants]);

  const selectedVariant = allVariants[state.displayedContentLocale] ?? null;
  const suppressFallbackBanner =
    state.displayedContentLocale !== actualContentLocale
    || state.requestedContentLocale !== actualContentLocale;
  const effectiveStatus: TranslationStatus = suppressFallbackBanner ? 'source' : translationStatus;
  const effectiveOriginLocale: Locale = ((selectedVariant?.meta.originLocale)
    ?? meta.originLocale
    ?? actualLocale) as Locale;

  const updateContentLocaleQuery = useCallback((nextContentLocale: BlogContentLocale) => {
    dispatch({ type: 'setRequestedLocale', locale: nextContentLocale });
  }, []);

  const markAuthGranted = useCallback(() => {
    dispatch({ type: 'authResolved', granted: true });
  }, []);

  const retryRequestedContentLocale = useCallback(() => {
    dispatch({ type: 'retryRequestedLocale' });
  }, []);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }

    inflightRequestRef.current?.abort();
    inflightRequestRef.current = null;

    startTransition(() => {
      dispatch({
        type: 'resetArticle',
        requestedContentLocale: getRequestedContentLocaleFromPath(routerAsPath) ?? defaultContentLocale,
        actualContentLocale,
        requiresAuth,
      });
    });
  }, [actualContentLocale, defaultContentLocale, hydrationReady, requiresAuth, routerAsPath]);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const currentLang = getRequestedContentLocaleFromPath(window.location.href);
    if (currentLang === state.requestedContentLocale) {
      return;
    }

    writeContentLocaleQuery(state.requestedContentLocale);
  }, [hydrationReady, state.requestedContentLocale]);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }

    // 只在 reducer 处于 'checking' 时发起授权探测：每次 resetArticle 都会把 authState 拉回
    // 'checking'，这里随之重跑；否则在「同一 group 的受保护文章之间互跳」场景下，
    // [requiresAuth, access.group] 引用不变，effect 不会触发，会停在 authChecking 永远不出来。
    if (state.authState !== 'checking') {
      return;
    }

    if (!requiresAuth || !access.group) {
      startTransition(() => {
        dispatch({ type: 'authResolved', granted: true });
      });
      return;
    }

    const controller = new AbortController();

    void fetch(`/api/grant-check?group=${encodeURIComponent(access.group)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as GrantCheckResponse;
        if (controller.signal.aborted) {
          return;
        }
        if (!response.ok || !data.ok) {
          startTransition(() => {
            dispatch({ type: 'authResolved', granted: false });
          });
          return;
        }
        startTransition(() => {
          dispatch({ type: 'authResolved', granted: data.granted });
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[useBlogPostState] grant-check failed:', error);
        startTransition(() => {
          dispatch({ type: 'authResolved', granted: false });
        });
      });

    return () => {
      controller.abort();
    };
  }, [access.group, hydrationReady, requiresAuth, state.authState]);

  useEffect(() => {
    if (!hydrationReady) {
      return;
    }

    if (state.authState !== 'granted') {
      inflightRequestRef.current?.abort();
      inflightRequestRef.current = null;
      return;
    }

    const requestedVariant = allVariants[state.requestedContentLocale];
    if (requestedVariant) {
      if (
        state.displayedContentLocale !== state.requestedContentLocale
        || state.viewState !== 'ready'
      ) {
        startTransition(() => {
          dispatch({ type: 'displayCachedLocale', locale: state.requestedContentLocale });
        });
      }
      return;
    }

    const requestKey = buildBlogVariantRequestKey(
      meta.slug,
      state.requestedContentLocale,
      state.authState,
    );

    if (state.activeRequestKey === requestKey) {
      return;
    }

    inflightRequestRef.current?.abort();
    const controller = new AbortController();
    inflightRequestRef.current = controller;

    startTransition(() => {
      dispatch({
        type: 'startVariantRequest',
        requestKey,
        locale: state.requestedContentLocale,
      });
    });

    void fetch(buildPostVariantApiPath(state.requestedContentLocale, meta.slug), {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = (await response.json()) as PostVariantResponse;
        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok || !data.ok) {
          const errorResponse = (data && !data.ok ? data : null) as PostVariantErrorResponse | null;
          startTransition(() => {
            dispatch({
              type: 'variantFailed',
              requestKey,
              locale: state.requestedContentLocale,
              code: errorResponse?.code ?? 'INTERNAL_ERROR',
              message: getVariantLoadErrorMessage(errorResponse),
            });
          });
          return;
        }

        startTransition(() => {
          dispatch({
            type: 'variantLoaded',
            requestKey,
            locale: state.requestedContentLocale,
            payload: data,
          });
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[useBlogPostState] post-variant failed:', error);
        startTransition(() => {
          dispatch({
            type: 'variantFailed',
            requestKey,
            locale: state.requestedContentLocale,
            code: 'INTERNAL_ERROR',
            message: 'Unable to load article content.',
          });
        });
      })
      .finally(() => {
        if (inflightRequestRef.current === controller) {
          inflightRequestRef.current = null;
        }
      });
  }, [
    allVariants,
    meta.slug,
    state.activeRequestKey,
    state.authState,
    state.displayedContentLocale,
    hydrationReady,
    state.requestedContentLocale,
    state.viewState,
  ]);

  useEffect(() => () => {
    inflightRequestRef.current?.abort();
    inflightRequestRef.current = null;
  }, []);

  return {
    defaultContentLocale,
    requestedContentLocale: state.requestedContentLocale,
    selectedContentLocale: state.displayedContentLocale,
    selectedVariant,
    viewState: state.viewState,
    loadingLang: state.loadingLocale,
    loadError: state.errorMessage,
    effectiveStatus,
    effectiveOriginLocale,
    updateContentLocaleQuery,
    markAuthGranted,
    retryRequestedContentLocale,
  };
}
