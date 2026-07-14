import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import '@/app/styles/globals.scss';
import { htmlLangMap, isLocale, locales, ogLocaleMap, type Locale } from '@/app/i18n/config';
import { loadMessages } from '@/app/i18n/data';
import DocumentBootstrapScript from '@/app/providers/DocumentBootstrapScript';
import { siteConfig, getSiteUrl } from '@/shared/config/site';
import { buildDocumentBootstrapScript } from '@/shared/lib/document-bootstrap';
import LocaleClientProviders from '@/app/providers/LocaleClientProviders';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : undefined;
  if (!locale) return {};

  const siteUrl = getSiteUrl();
  return {
    title: siteConfig.metaTitle,
    description: siteConfig.metaDescription,
    icons: {
      icon: [
        { url: '/favicon.ico', type: 'image/x-icon' },
        { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    manifest: '/icons/site.webmanifest',
    openGraph: {
      siteName: siteConfig.name,
      locale: ogLocaleMap[locale],
      images: [`${siteUrl}${siteConfig.assets.ogImage}`],
    },
    twitter: {
      card: 'summary',
      images: [`${siteUrl}${siteConfig.assets.twitterImage}`],
    },
    alternates: {
      types: {
        'application/rss+xml': `/${locale}/rss.xml`,
      },
    },
  };
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * This locale segment is the App Router root layout. Locale is a static route
 * parameter, so it can restore the correct document language without turning
 * SSG/ISR pages dynamic. GEO_COUNTRY remains client-bootstrap-only to avoid
 * leaking a visitor-specific country into shared cached HTML.
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  setRequestLocale(locale);
  const messages = await loadMessages(locale);

  return (
    <html lang={htmlLangMap[locale]} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' ? (
          <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        ) : null}
        {siteConfig.fonts.cdnPreconnect.map((preconnect) => (
          <link
            key={preconnect.href}
            rel="preconnect"
            href={preconnect.href}
            {...(preconnect.crossOrigin ? { crossOrigin: preconnect.crossOrigin } : {})}
          />
        ))}
        <link href={siteConfig.fonts.cdnStylesheet} rel="stylesheet" />
        <DocumentBootstrapScript script={buildDocumentBootstrapScript()} />
      </head>
      <body>
        <LocaleClientProviders locale={locale} messages={messages}>{children}</LocaleClientProviders>
      </body>
    </html>
  );
}
