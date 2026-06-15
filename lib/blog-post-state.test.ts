import { describe, expect, it } from 'vitest';

import {
  blogPostStateReducer,
  createInitialBlogPostState,
  shouldSuppressFallbackBanner,
} from './blog-post-state';

const variantPayload = {
  meta: {
    slug: 'init',
    title: 'Init',
    date: '2026-01-01',
    excerpt: 'Excerpt',
    tags: [],
    readingMinutes: 1,
    access: { mode: 'public' as const },
  },
  mdxSource: { compiledSource: 'test', frontmatter: {}, scope: {} },
};

describe('blogPostStateReducer', () => {
  it('resets article state when slug or route context changes', () => {
    const initial = createInitialBlogPostState({
      requestedContentLocale: 'en',
      actualContentLocale: 'en',
      requiresAuth: false,
    });
    const loading = blogPostStateReducer(initial, {
      type: 'startVariantRequest',
      requestKey: 'init:ja:granted',
      locale: 'ja',
    });

    const reset = blogPostStateReducer(loading, {
      type: 'resetArticle',
      requestedContentLocale: 'zh-CN',
      actualContentLocale: 'zh-CN',
      requiresAuth: true,
    });

    expect(reset.requestedContentLocale).toBe('zh-CN');
    expect(reset.displayedContentLocale).toBe('zh-CN');
    expect(reset.viewState).toBe('authChecking');
    expect(reset.lazyVariants).toEqual({});
  });

  it('drops stale request results after a newer request becomes active', () => {
    const initial = createInitialBlogPostState({
      requestedContentLocale: 'en',
      actualContentLocale: 'en',
      requiresAuth: false,
    });

    const firstRequest = blogPostStateReducer(initial, {
      type: 'startVariantRequest',
      requestKey: 'init:ja:granted',
      locale: 'ja',
    });
    const secondRequest = blogPostStateReducer(firstRequest, {
      type: 'startVariantRequest',
      requestKey: 'init:fr:granted',
      locale: 'fr',
    });
    const staleResult = blogPostStateReducer(secondRequest, {
      type: 'variantLoaded',
      requestKey: 'init:ja:granted',
      locale: 'ja',
      payload: variantPayload,
    });

    expect(staleResult.activeRequestKey).toBe('init:fr:granted');
    expect(staleResult.displayedContentLocale).toBe('en');
    expect(staleResult.lazyVariants.ja).toBeUndefined();
  });

  it('falls back to authRequired on forbidden variant response', () => {
    const initial = createInitialBlogPostState({
      requestedContentLocale: 'en',
      actualContentLocale: 'en',
      requiresAuth: false,
    });
    const loading = blogPostStateReducer(initial, {
      type: 'startVariantRequest',
      requestKey: 'init:ja:granted',
      locale: 'ja',
    });

    const forbidden = blogPostStateReducer(loading, {
      type: 'variantFailed',
      requestKey: 'init:ja:granted',
      locale: 'ja',
      code: 'FORBIDDEN',
      message: 'Access grant required.',
    });

    expect(forbidden.authState).toBe('required');
    expect(forbidden.viewState).toBe('authRequired');
    expect(forbidden.loadingLocale).toBeNull();
  });
});

describe('shouldSuppressFallbackBanner', () => {
  it('suppresses fallback banner during alternate content-locale display', () => {
    expect(shouldSuppressFallbackBanner({
      requestedContentLocale: 'ja',
      displayedContentLocale: 'en',
      actualContentLocale: 'zh-CN',
    })).toBe(true);
  });
});
