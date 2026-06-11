import { Html, Head, Main, NextScript } from 'next/document';
import { siteConfig, getSiteUrl } from '../data/site';

// 字体走自有 CDN（cdn.arsvine.com → 腾讯云 COS 香港桶）：
//   - 国内访客 fonts.googleapis.com / fonts.gstatic.com 基本不可达
//   - 香港 COS 对国内 / 港澳延迟最低，对欧美 / 日韩 / 港台增加 80-150ms 但稳定可达
//   - 静态预渲染下无法在 SSR 阶段按访客地域分流（HTML 在 build 时固化），
//     所以统一选最稳的源
// 字体文件由 scripts/fetch-google-fonts.mjs 抓取 Google Fonts CSS、下载所有
// woff2、改写 url 后上传到 cos://arsvine-cdn/fonts/，详见 lib/cdn.ts 注释。
export default function Document() {
  const siteUrl = getSiteUrl();
  return (
    <Html lang={siteConfig.locale.htmlLang} data-scroll-behavior="smooth">
      <Head>
        {process.env.NODE_ENV === 'production' && (
          <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        )}

        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:locale" content={siteConfig.locale.ogLocale} />
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
        <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
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
