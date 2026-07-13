import type { GetServerSideProps, Redirect } from 'next';
import { defaultLocale, isLocale, type Locale } from '@/app/i18n/config';

/**
 * 旧 URL 别名（/[locale]/posts、/license、/blog）的统一重定向 helper。
 *
 * 两类调用场景：
 *   - SSR 307 / 308：GSSP redirect 段，permanent=false；
 *   - SSR 301：永久重定向（license → copyright）。
 *
 * locale 解析：query.locale 必须是支持的 locale，否则回退到 defaultLocale。
 * 不会因未支持 locale 而 throw —— 这些是"旧 URL 别名"，应当 silent redirect
 * 到默认 locale 路径，不阻断访客。
 */

export type LocaleRedirectOptions = {
  /** 目标相对路径，含 locale 前缀，例如 '/en/content#blog'。 */
  destination: (locale: Locale) => string;
  /** HTTP 状态码语义：true = 301 permanent；false = 307/308 temporary。 */
  permanent: boolean;
  /** 重定向时是否保留 query string。默认 false（clean URL）。 */
  preserveQuery?: boolean;
};

export function localeAwareRedirect(
  params: Record<string, string | string[] | undefined> | undefined,
  options: LocaleRedirectOptions,
): { redirect: Redirect } {
  const rawLocale = params?.locale;
  const locale: Locale = isLocale(typeof rawLocale === 'string' ? rawLocale : undefined)
    ? (rawLocale as Locale)
    : defaultLocale;

  return {
    redirect: {
      destination: options.destination(locale),
      permanent: options.permanent,
    },
  };
}

/**
 * GSP-style helper for `/[locale]/blog` 这种 fallback: false 路径：
 * 不能 SSR redirect（没 runtime），必须在客户端 router.replace。
 */
export function buildLocaleRedirectPath(
  params: Record<string, string | string[] | undefined> | undefined,
  buildDestination: (locale: Locale) => string,
): string {
  const rawLocale = params?.locale;
  const locale: Locale = isLocale(typeof rawLocale === 'string' ? rawLocale : undefined)
    ? (rawLocale as Locale)
    : defaultLocale;
  return buildDestination(locale);
}

/**
 * 兼容旧 API 风格：直接给出 getServerSideProps。
 */
export function makeLocaleRedirectGSSP(options: Omit<LocaleRedirectOptions, 'preserveQuery'>) {
  const handler: GetServerSideProps = async ({ params }) =>
    localeAwareRedirect(params, options);
  return handler;
}
