/**
 * next-intl 服务端配置（next-intl plugin 钩入点）。
 *
 * App Router 通过该配置取得已验证 locale 的静态 message registry。
 * 不允许改为动态 import/require：构建必须保持没有 critical-dependency warning。
 */
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from './config';
import { loadMessages } from './data';

export default getRequestConfig(async ({ requestLocale }) => {
  const rawLocale = await requestLocale;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await loadMessages(locale);
  return {
    locale,
    messages,
    timeZone: 'Asia/Shanghai',
  };
});
