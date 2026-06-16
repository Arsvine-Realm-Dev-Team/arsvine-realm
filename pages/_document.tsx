import { Html, Head, Main, NextScript } from 'next/document';
import type { DocumentContext } from 'next/document';
import Document from 'next/document';
import { siteConfig, getSiteUrl } from '../data/site';
import { buildDocumentBootstrapScript } from '../lib/document-bootstrap';
import {
  htmlLangMap,
  ogLocaleMap,
  defaultLocale,
  isLocale,
  type Locale,
} from '../i18n/config';

/**
 * _document 在 Pages Router 下不能用 hook。
 * locale 通过 ctx.params 或者 ctx.pathname 解析：[locale] 段在 URL 中。
 *
 * country 不再由 SSR 注入：
 *   原方案是 proxy.ts 注入 x-geo-country 请求头 → SSR 写 <html data-country/data-x-blocked/...>，
 *   但 SSG/ISR 页面会被 Vercel CDN 共享缓存，第一访客的 country 会污染后续访客。
 *   现方案：SSR 只渲染中性 HTML；客户端 hydration 前由 buildDocumentBootstrapScript() 内联脚本
 *   读 GEO_COUNTRY cookie 写到 <html dataset>。脚本是 HTML 解析期同步执行，CSS 应用前即完成，
 *   不会出现"先显示再隐藏"的首屏闪烁。
 */
interface DocProps {
  locale: Locale;
}

class MyDocument extends Document<DocProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const rawLocale = (ctx.query?.locale as string | undefined);
    const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
    return { ...initialProps, locale };
  }

  render() {
    const { locale } = this.props;
    const siteUrl = getSiteUrl();
    return (
      <Html
        lang={htmlLangMap[locale]}
        data-scroll-behavior="smooth"
      >
        <Head>
          {process.env.NODE_ENV === 'production' && (
            <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
          )}

          <meta property="og:site_name" content={siteConfig.name} />
          <meta property="og:locale" content={ogLocaleMap[locale]} />
          <meta property="og:image" content={`${siteUrl}${siteConfig.assets.ogImage}`} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:image" content={`${siteUrl}${siteConfig.assets.twitterImage}`} />

          <link rel="icon" type="image/x-icon" href="/favicon.ico" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/icons/site.webmanifest" />
          {siteConfig.fonts.cdnPreconnect.map((p) => (
            <link
              key={p.href}
              rel="preconnect"
              href={p.href}
              {...(p.crossOrigin ? { crossOrigin: p.crossOrigin } : {})}
            />
          ))}
          <link href={siteConfig.fonts.cdnStylesheet} rel="stylesheet" />
          <link rel="alternate" type="application/rss+xml" title="RSS Feed" href={`/${locale}/rss.xml`} />
          {/*
            同步内联脚本：在 hydration / CSS 应用之前读 GEO_COUNTRY cookie 写 <html dataset>，
            同时恢复 power-system / theme-mode。country 不再走 SSR 注入（避免 CDN 缓存污染），
            完全由这段脚本在客户端 bootstrap。
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: buildDocumentBootstrapScript(),
            }}
          />
          {process.env.NEXT_PUBLIC_UMAMI_SRC && (
            <script
              defer
              src={process.env.NEXT_PUBLIC_UMAMI_SRC}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              {...(process.env.NEXT_PUBLIC_UMAMI_DOMAINS
                ? { 'data-domains': process.env.NEXT_PUBLIC_UMAMI_DOMAINS }
                : {})}
              data-do-not-track="true"
              data-exclude-search="true"
            />
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
