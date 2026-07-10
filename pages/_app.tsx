import { useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NextIntlClientProvider } from 'next-intl';
import '../styles/globals.scss';
import { AppProvider } from '../contexts/AppContext';
import { TransitionProvider } from '../contexts/TransitionContext';
import { SiteAssetsProvider } from '../contexts/SiteAssetsContext';
import MainLayout from '../components/layout/MainLayout';
import TelemetryRoot from '../components/telemetry/TelemetryRoot';
import { resolveLocale, type Locale } from '../i18n/config';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const locale: Locale = resolveLocale(pageProps.locale ?? router.query.locale, router.asPath);
  // 与 useLayoutRouteMode / useRouteLoadingKind 保持一致：
  // standalone 详情页需要让 pageTransitionLayer 高于左侧 HUD，避免点击穿透。
  const isStandalone =
    router.pathname === '/[locale]/game'
    || router.pathname.startsWith('/[locale]/game/')
    || router.pathname.startsWith('/[locale]/web/')
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
      <SiteAssetsProvider>
      <AppProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
        <TransitionProvider pageWrapperRef={pageWrapperRef}>
          <MainLayout appLocale={locale}>
            <div
              ref={pageWrapperRef}
              className="pageTransitionLayer"
              style={{ zIndex: isStandalone ? 15 : 2 }}
            >
              <Component {...pageProps} />
            </div>
          </MainLayout>
        </TransitionProvider>
        <TelemetryRoot />
      </AppProvider>
      </SiteAssetsProvider>
    </NextIntlClientProvider>
  );
}

export default MyApp;
