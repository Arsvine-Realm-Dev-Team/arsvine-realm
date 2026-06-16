import { describe, expect, it } from 'vitest';

import { __internals } from './proxy';

const { shouldBypass, pickLocaleFromHeader, coerceCookieLocale, LOOKS_LIKE_LOCALE } = __internals;

describe('shouldBypass', () => {
  it('bypasses /api/* and other known prefixes', () => {
    expect(shouldBypass('/api/hitokoto')).toBe(true);
    expect(shouldBypass('/_next/static/chunks/foo.js')).toBe(true);
    expect(shouldBypass('/_vercel/insights/script.js')).toBe(true);
    expect(shouldBypass('/favicon.ico')).toBe(true);
    expect(shouldBypass('/icons/favicon-32x32.png')).toBe(true);
    expect(shouldBypass('/fonts/dosis.woff2')).toBe(true);
    expect(shouldBypass('/robots.txt')).toBe(true);
    expect(shouldBypass('/sitemap.xml')).toBe(true);
    expect(shouldBypass('/rss.xml')).toBe(true);
  });

  it('bypasses any pathname with a file extension', () => {
    expect(shouldBypass('/foo.png')).toBe(true);
    expect(shouldBypass('/some/asset.css')).toBe(true);
    expect(shouldBypass('/weird.JS')).toBe(true);
  });

  it('does not bypass locale paths or business pages', () => {
    expect(shouldBypass('/en')).toBe(false);
    expect(shouldBypass('/zh-CN/blog/init')).toBe(false);
    expect(shouldBypass('/en/access/test')).toBe(false);
  });
});

describe('pickLocaleFromHeader', () => {
  it('returns defaultLocale when Accept-Language is missing', () => {
    expect(pickLocaleFromHeader(null)).toBe('zh-CN');
    expect(pickLocaleFromHeader('')).toBe('zh-CN');
  });

  it('maps English tags to en', () => {
    expect(pickLocaleFromHeader('en-US,en;q=0.9')).toBe('en');
    expect(pickLocaleFromHeader('en-GB')).toBe('en');
  });

  it('maps Traditional Chinese tags to zh-TW', () => {
    expect(pickLocaleFromHeader('zh-TW')).toBe('zh-TW');
    expect(pickLocaleFromHeader('zh-Hant')).toBe('zh-TW');
    expect(pickLocaleFromHeader('zh-HK')).toBe('zh-TW');
  });

  it('maps Simplified Chinese tags to zh-CN', () => {
    expect(pickLocaleFromHeader('zh-CN')).toBe('zh-CN');
    expect(pickLocaleFromHeader('zh-Hans')).toBe('zh-CN');
    expect(pickLocaleFromHeader('zh')).toBe('zh-CN');
  });

  it('respects q-value weight ordering', () => {
    expect(pickLocaleFromHeader('fr-FR;q=1,en;q=0.5')).toBe('en');
    expect(pickLocaleFromHeader('en;q=0.1,zh-CN;q=0.9')).toBe('zh-CN');
  });

  it('falls back to defaultLocale for unknown tags', () => {
    expect(pickLocaleFromHeader('fr-FR,de;q=0.9')).toBe('zh-CN');
    expect(pickLocaleFromHeader('ja-JP')).toBe('zh-CN');
  });
});

describe('coerceCookieLocale', () => {
  it('returns undefined for empty / invalid input', () => {
    expect(coerceCookieLocale(undefined)).toBeUndefined();
    expect(coerceCookieLocale('')).toBeUndefined();
    expect(coerceCookieLocale('fr')).toBeUndefined();
    expect(coerceCookieLocale('garbage')).toBeUndefined();
  });

  it('returns the matching Locale for canonical values', () => {
    expect(coerceCookieLocale('zh-CN')).toBe('zh-CN');
    expect(coerceCookieLocale('zh-TW')).toBe('zh-TW');
    expect(coerceCookieLocale('en')).toBe('en');
  });

  it('maps common variants to supported locales', () => {
    expect(coerceCookieLocale('zh')).toBe('zh-CN');
    expect(coerceCookieLocale('zh-Hans')).toBe('zh-CN');
    expect(coerceCookieLocale('zh-Hant')).toBe('zh-TW');
    expect(coerceCookieLocale('zh-HK')).toBe('zh-TW');
    expect(coerceCookieLocale('en-US')).toBe('en');
    expect(coerceCookieLocale('en-GB')).toBe('en');
  });

  it('is case-insensitive on variants', () => {
    expect(coerceCookieLocale('ZH-cn')).toBe('zh-CN');
    expect(coerceCookieLocale('EN')).toBe('en');
  });

  it('trims whitespace', () => {
    expect(coerceCookieLocale('  en  ')).toBe('en');
  });
});

describe('LOOKS_LIKE_LOCALE regex', () => {
  it('matches short BCP-47-shaped tags', () => {
    expect(LOOKS_LIKE_LOCALE.test('fr')).toBe(true);
    expect(LOOKS_LIKE_LOCALE.test('zh-CN')).toBe(true);
    expect(LOOKS_LIKE_LOCALE.test('zh-Hant')).toBe(true);
  });

  it('rejects first segments that do not look like a locale', () => {
    // 多于 2 字符纯字母没 dash → 不匹配
    expect(LOOKS_LIKE_LOCALE.test('about')).toBe(false);
    expect(LOOKS_LIKE_LOCALE.test('blog')).toBe(false);
    // 数字开头
    expect(LOOKS_LIKE_LOCALE.test('123')).toBe(false);
    // 脚本/区域后缀超过 4 字符
    expect(LOOKS_LIKE_LOCALE.test('zh-VERYLONG')).toBe(false);
    // 多 dash 段（多段 BCP-47 形式，不应被当成短 locale）
    expect(LOOKS_LIKE_LOCALE.test('zh-cn-hans-cn')).toBe(false);
  });
});
