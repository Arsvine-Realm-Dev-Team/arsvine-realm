import { Html, Head, Main, NextScript } from 'next/document';
import { siteConfig } from '../data/site';

export default function Document() {
  return (
    <Html lang={siteConfig.locale.htmlLang}>
      <Head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />

        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={siteConfig.locale.ogLocale} />
        <meta property="og:image" content={siteConfig.assets.ogImage} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:image" content={siteConfig.assets.twitterImage} />

        <link rel="icon" href={siteConfig.assets.icon} />
        {siteConfig.fonts.preconnect.map((p) => (
          <link
            key={p.href}
            rel="preconnect"
            href={p.href}
            {...(p.crossOrigin ? { crossOrigin: p.crossOrigin } : {})}
          />
        ))}
        <link href={siteConfig.fonts.stylesheet} rel="stylesheet" />
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