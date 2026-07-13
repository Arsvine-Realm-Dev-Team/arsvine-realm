import { useRef } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NextIntlClientProvider } from 'next-intl';
import '@/app/styles/globals.scss';
import TelemetryRoot from '../features/telemetry/public';
import { resolveLocale, type Locale } from '@/app/i18n/config';
import AppProviders from '../app/providers/AppProviders';
import AppShell from '../app/shell/AppShell';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const locale: Locale = resolveLocale(pageProps.locale ?? router.query.locale, router.asPath);
  // 与 useLayoutRouteMode / useRouteLoadingKind 保持一致：
  // standalone 详情页需要让 pageTransitionLayer 高于左侧 HUD，避免点击穿透。
  const isStandalone =
    router.pathname.startsWith('/[locale]/web/')
    || router.pathname.startsWith('/[locale]/life/')
    || router.pathname.startsWith('/[locale]/blog/');

  const messagesByLocale = pageProps.messagesByLocale as Partial<Record<Locale, Record<string, unknown>>> | undefined;
  // pageProps.messages 来自页面级 getStaticProps；根级错误页可改用 messagesByLocale 兜底。
  const messages = pageProps.messages ?? messagesByLocale?.[locale] ?? {};

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Shanghai"
      messages={messages}
      onError={() => {/* 静默：缺译走 fallback，不阻塞渲染 */}}
      getMessageFallback={({ key }) => key}
    >
      <AppProviders pageWrapperRef={pageWrapperRef}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
          <AppShell locale={locale}>
            <div
              ref={pageWrapperRef}
              className="pageTransitionLayer"
              style={{ zIndex: isStandalone ? 15 : 2 }}
            >
              <Component {...pageProps} />
            </div>
          </AppShell>
        <TelemetryRoot />
      </AppProviders>
    </NextIntlClientProvider>
  );
}

export default MyApp;
