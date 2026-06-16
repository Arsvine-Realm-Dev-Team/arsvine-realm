import { useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NextIntlClientProvider } from 'next-intl';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../styles/globals.scss';
import { AppProvider } from '../contexts/AppContext';
import { TransitionProvider } from '../contexts/TransitionContext';
import MainLayout from '../components/layout/MainLayout';
import { defaultLocale, isLocale, type Locale } from '../i18n/config';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  // 取当前 locale：URL params 优先（[locale] 路由），否则 fallback 默认
  const queryLocale = router.query.locale;
  const locale: Locale = isLocale(queryLocale) ? queryLocale : defaultLocale;
  // 详情页（已 locale 化）的 isStandalone 判定
  const isStandalone =
    router.pathname === `/[locale]/game` ||
    router.pathname.startsWith(`/[locale]/life/`);

  // pageProps.messages 来自页面级 getStaticProps；缺失时给空对象兜底
  const messages = pageProps.messages ?? {};
  const shouldRenderVercelTelemetry = process.env.NODE_ENV === 'production';

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Shanghai"
      messages={messages}
      onError={() => {/* 静默：缺译走 fallback，不阻塞渲染 */}}
      getMessageFallback={({ key }) => key}
    >
      <AppProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
        <TransitionProvider pageWrapperRef={pageWrapperRef}>
          <MainLayout>
            <div
              ref={pageWrapperRef}
              className="pageTransitionLayer"
              style={{ zIndex: isStandalone ? 15 : 2 }}
            >
              <Component {...pageProps} />
            </div>
          </MainLayout>
        </TransitionProvider>
        {shouldRenderVercelTelemetry ? <Analytics /> : null}
        {shouldRenderVercelTelemetry ? <SpeedInsights /> : null}
      </AppProvider>
    </NextIntlClientProvider>
  );
}

export default MyApp;
