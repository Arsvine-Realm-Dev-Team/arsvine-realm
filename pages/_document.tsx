import { Html, Head, Main, NextScript } from 'next/document';
import type { DocumentContext } from 'next/document';
import Document from 'next/document';
import { siteConfig, getSiteUrl } from '../data/site';
import { buildDocumentBootstrapScript, resolveRegionAttributes } from '../lib/document-bootstrap';
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
 * 静态预渲染时 ctx.params.locale 可用；客户端 navigation 时也会被传入。
 *
 * country 优先级：
 *   1. proxy.ts 注入的 x-geo-country 请求头（同一次刷新立即生效，VPN 切换不滞后）
 *   2. GEO_COUNTRY cookie（fallback，譬如某些静态化路径绕过 proxy 的情况）
 *   3. 空（未知）
 *
 * 把 country 写到 <html data-country>，并用 data-x-blocked="true" 让 CSS
 * 直接隐藏被屏蔽地区不可达的外链图标，从根上消除首屏闪烁。
 */
interface DocProps {
  locale: Locale;
  country: string;
  xBlocked: boolean;
  bilibiliBlocked: boolean;
}

function parseCookieHeader(header: string | undefined, name: string): string {
  if (!header) return '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=')).trim();
  }
  return '';
}

class MyDocument extends Document<DocProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const rawLocale = (ctx.query?.locale as string | undefined);
    const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

    // ctx.req 只在 SSR 阶段存在；客户端 navigation 不会重新跑 _document。
    const req = ctx.req;
    let country = '';
    if (req) {
      const headerCountry = (req.headers['x-geo-country'] as string | undefined) ?? '';
      const cookieCountry = parseCookieHeader(req.headers.cookie, 'GEO_COUNTRY');
      country = (headerCountry || cookieCountry).toUpperCase();
    }

    const { xBlocked, bilibiliBlocked } = resolveRegionAttributes(country);
    return { ...initialProps, locale, country, xBlocked, bilibiliBlocked };
  }

  render() {
    const { locale, country, xBlocked, bilibiliBlocked } = this.props;
    const siteUrl = getSiteUrl();
    return (
      <Html
        lang={htmlLangMap[locale]}
        data-scroll-behavior="smooth"
        {...(country ? { 'data-country': country } : {})}
        {...(xBlocked ? { 'data-x-blocked': 'true' } : {})}
        {...(bilibiliBlocked ? { 'data-bilibili-blocked': 'true' } : {})}
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
            Hydration 前同步把 GEO_COUNTRY cookie 投到 <html dataset> 上。
            必要性：[locale] 页面走 getStaticProps，运行时不会再跑 _document.getInitialProps，
            所以 server-side 注入只在 dynamic page 上生效；这里用一段同步内联脚本兜底，
            确保 CSS 在浏览器开始绘制前就能命中 [data-x-blocked]。
            Inline 脚本设置的 attribute 与 React 渲染的 props 在 dev 偶尔会产生
            hydration warning，故仅在两个 dataset 与 props 不同时才写，避免噪音。
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
