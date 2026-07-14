import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  coerceCookieLocale,
  LOCALE_PATH_PATTERN,
  pickLocaleFromAcceptLanguage,
  shouldBypassLocaleProxy,
} from '../../src/shared/lib/locale-resolution';

describe('shouldBypassLocaleProxy', () => {
  it('bypasses /api/* and other known prefixes', () => {
    expect(shouldBypassLocaleProxy('/api/hitokoto')).toBe(true);
    expect(shouldBypassLocaleProxy('/_next/static/chunks/foo.js')).toBe(true);
    expect(shouldBypassLocaleProxy('/_vercel/insights/script.js')).toBe(true);
    expect(shouldBypassLocaleProxy('/favicon.ico')).toBe(true);
    expect(shouldBypassLocaleProxy('/icons/favicon-32x32.png')).toBe(true);
    expect(shouldBypassLocaleProxy('/fonts/dosis.woff2')).toBe(true);
    expect(shouldBypassLocaleProxy('/robots.txt')).toBe(true);
    expect(shouldBypassLocaleProxy('/sitemap.xml')).toBe(true);
    expect(shouldBypassLocaleProxy('/rss.xml')).toBe(true);
  });

  it('bypasses any pathname with a file extension', () => {
    expect(shouldBypassLocaleProxy('/foo.png')).toBe(true);
    expect(shouldBypassLocaleProxy('/some/asset.css')).toBe(true);
    expect(shouldBypassLocaleProxy('/weird.JS')).toBe(true);
  });

  it('does not bypass locale paths or business pages', () => {
    expect(shouldBypassLocaleProxy('/en')).toBe(false);
    expect(shouldBypassLocaleProxy('/zh-CN/blog/init')).toBe(false);
    expect(shouldBypassLocaleProxy('/en/access/test')).toBe(false);
  });
});

describe('pickLocaleFromAcceptLanguage', () => {
  it('returns defaultLocale when Accept-Language is missing', () => {
    expect(pickLocaleFromAcceptLanguage(null)).toBe('zh-CN');
    expect(pickLocaleFromAcceptLanguage('')).toBe('zh-CN');
  });

  it('maps English tags to en', () => {
    expect(pickLocaleFromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(pickLocaleFromAcceptLanguage('en-GB')).toBe('en');
  });

  it('maps Traditional Chinese tags to zh-TW', () => {
    expect(pickLocaleFromAcceptLanguage('zh-TW')).toBe('zh-TW');
    expect(pickLocaleFromAcceptLanguage('zh-Hant')).toBe('zh-TW');
    expect(pickLocaleFromAcceptLanguage('zh-HK')).toBe('zh-TW');
  });

  it('maps Simplified Chinese tags to zh-CN', () => {
    expect(pickLocaleFromAcceptLanguage('zh-CN')).toBe('zh-CN');
    expect(pickLocaleFromAcceptLanguage('zh-Hans')).toBe('zh-CN');
    expect(pickLocaleFromAcceptLanguage('zh')).toBe('zh-CN');
  });

  it('respects q-value weight ordering', () => {
    expect(pickLocaleFromAcceptLanguage('fr-FR;q=1,en;q=0.5')).toBe('en');
    expect(pickLocaleFromAcceptLanguage('en;q=0.1,zh-CN;q=0.9')).toBe('zh-CN');
  });

  it('falls back to defaultLocale for unknown tags', () => {
    expect(pickLocaleFromAcceptLanguage('fr-FR,de;q=0.9')).toBe('zh-CN');
    expect(pickLocaleFromAcceptLanguage('ja-JP')).toBe('zh-CN');
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

describe('LOCALE_PATH_PATTERN regex', () => {
  it('matches short BCP-47-shaped tags', () => {
    expect(LOCALE_PATH_PATTERN.test('fr')).toBe(true);
    expect(LOCALE_PATH_PATTERN.test('zh-CN')).toBe(true);
    expect(LOCALE_PATH_PATTERN.test('zh-Hant')).toBe(true);
  });

  it('rejects first segments that do not look like a locale', () => {
    // 多于 2 字符纯字母没 dash → 不匹配
    expect(LOCALE_PATH_PATTERN.test('about')).toBe(false);
    expect(LOCALE_PATH_PATTERN.test('blog')).toBe(false);
    // 数字开头
    expect(LOCALE_PATH_PATTERN.test('123')).toBe(false);
    // 脚本/区域后缀超过 4 字符
    expect(LOCALE_PATH_PATTERN.test('zh-VERYLONG')).toBe(false);
    // 多 dash 段（多段 BCP-47 形式，不应被当成短 locale）
    expect(LOCALE_PATH_PATTERN.test('zh-cn-hans-cn')).toBe(false);
  });
});

describe('locale redirect cache contract', () => {
  it('varies bare-path redirects by cookie and accepted language', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');

    expect(source).toContain("response.headers.set('Vary', 'Cookie, Accept-Language')");
    expect(source).not.toContain('void locales');
  });
});
