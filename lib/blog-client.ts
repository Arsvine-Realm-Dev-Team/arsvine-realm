import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

import type { BlogPostMeta } from '../types';
import { type Locale } from '../i18n/config';
import type { BlogContentLocale } from './blog';

export const blogContentLocaleLabels: Record<BlogContentLocale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'English',
  ja: '日本語',
  ru: 'Русский',
  fr: 'Français',
};

export interface BlogVariantPayload {
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
}

export function isBlogContentLocale(value: unknown): value is BlogContentLocale {
  return typeof value === 'string' && value in blogContentLocaleLabels;
}

export function getRequestedContentLocaleFromPath(asPath: string): BlogContentLocale | null {
  const query = asPath.split('?')[1]?.split('#')[0];
  if (!query) {
    return null;
  }

  const lang = new URLSearchParams(query).get('lang');
  return lang && isBlogContentLocale(lang) ? lang : null;
}

export function resolveDefaultContentLocale(
  pageLocale: Locale,
  availableLocales: BlogContentLocale[],
  fallbackLocale: BlogContentLocale,
): BlogContentLocale {
  if (availableLocales.includes(pageLocale)) {
    return pageLocale;
  }
  return fallbackLocale;
}

export function buildBlogPostHref(
  locale: Locale,
  slug: string,
  contentLocale: BlogContentLocale,
) {
  return `/${locale}/blog/${slug}?lang=${encodeURIComponent(contentLocale)}`;
}

export function buildPostVariantApiPath(locale: BlogContentLocale, slug: string) {
  const search = new URLSearchParams({
    locale,
    slug,
  });
  return `/api/post-variant?${search.toString()}`;
}

export function buildBlogVariantRequestKey(
  slug: string,
  requestedContentLocale: BlogContentLocale,
  authState: string,
) {
  return `${slug}:${requestedContentLocale}:${authState}`;
}
