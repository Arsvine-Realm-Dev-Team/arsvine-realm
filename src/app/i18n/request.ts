/**
 * next-intl 服务端配置（next-intl plugin 钩入点）。
 *
 * 项目使用 Pages Router，messages 实际是在每个页面的 getStaticProps
 * 里手动 import 并传给 NextIntlClientProvider 的，所以本文件目前并
 * 不承担运行时职责，只是满足 next-intl/plugin 的存在性检测。
 */
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from './config';
import { loadMessages } from './data';

export default getRequestConfig(async ({ locale: rawLocale }) => {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await loadMessages(locale);
  return {
    locale,
    messages,
    timeZone: 'Asia/Shanghai',
  };
});
