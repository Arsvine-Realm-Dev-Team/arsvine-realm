/**
 * i18n 配置 — 三语支持单一信息源
 *
 * 修改 locales 数组必须同步：
 *   - locales/<locale>.json 三个文件齐全
 *   - data/<file>.<locale>.ts 缺译会 fallback 到 defaultLocale
 *   - proxy.ts 的 locale 检测
 *   - sitemap / rss / hreflang
 */
export const locales = ['zh-CN', 'zh-TW', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

/** locale → <html lang> 属性值（BCP-47） */
export const htmlLangMap: Record<Locale, string> = {
  'zh-CN': 'zh-Hans-CN',
  'zh-TW': 'zh-Hant-TW',
  en: 'en-US',
};

/** locale → og:locale 属性值（Facebook 风格 underscore） */
export const ogLocaleMap: Record<Locale, string> = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  en: 'en_US',
};

/** locale → RSS <language> 字段 */
export const rssLanguageMap: Record<Locale, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
};

/** locale → LanguageSwitcher 上显示的短标签 */
export const localeShortLabel: Record<Locale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'ENG',
};

/** locale → 自语言下的可读全名（fallback banner 用） */
export const localeNativeName: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function getLocaleFromPath(path: string | null | undefined): Locale | undefined {
  if (typeof path !== 'string') return undefined;

  const pathWithoutQuery = path.split('?')[0]?.split('#')[0] ?? path;
  const firstSegment = pathWithoutQuery.split('/').filter(Boolean)[0];

  return isLocale(firstSegment) ? firstSegment : undefined;
}

export function resolveLocale(rawLocale: unknown, path?: string | null): Locale {
  return isLocale(rawLocale) ? rawLocale : getLocaleFromPath(path) ?? defaultLocale;
}
