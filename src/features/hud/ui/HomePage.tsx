import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import { useHud } from '../model/HudProvider';
import { useTransition } from '../../navigation/model/TransitionProvider';
import NavigationColumns from './layout/NavigationColumns';
import HreflangLinks from '../../../shared/ui/HreflangLinks';
import { getSiteUrl } from '@/shared/config/site';
import { locales, type Locale } from '@/shared/contracts/locale';
import { loadMessages } from '@/app/i18n/data';

interface HomeProps {
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function Home({ locale }: HomeProps) {
  const router = useRouter();
  const { navigateTo } = useTransition();
  const tSite = useTranslations('pages.site');
  const {
    linesAnimated, pulsingNormalIndices, pulsingReverseIndices,
    textVisible, animationsComplete, isInverted, columnPhase,
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  } = useHud();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    router.prefetch(`/${locale}/content`);
  }, [router, locale]);

  const handleColumnClick = (columnIndex: number) => {
    if (!animationsComplete) return;
    const sectionHashes = ['works', 'experience', 'blog', 'life', 'contact', 'about'];
    if (columnIndex < sectionHashes.length) {
      navigateTo(`/${locale}/content#${sectionHashes[columnIndex]}`);
    }
  };

  return (
    <>
      <Head>
        <title>{tSite('title')}</title>
        <meta name="description" content={tSite('description')} />
        <meta property="og:title" content={tSite('title')} />
        <meta property="og:description" content={tSite('description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/`} />
        <meta name="twitter:title" content={tSite('title')} />
        <meta name="twitter:description" content={tSite('description')} />
        <HreflangLinks basePath="/" />
      </Head>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <NavigationColumns
          activeSection="home"
          linesAnimated={linesAnimated}
          pulsingNormalIndices={pulsingNormalIndices}
          pulsingReverseIndices={pulsingReverseIndices}
          textVisible={textVisible}
          animationsComplete={animationsComplete}
          isInverted={isInverted}
          columnPhase={columnPhase}
          randomHudTexts={randomHudTexts}
          branchText1={branchText1}
          branchText2={branchText2}
          branchText3={branchText3}
          branchText4={branchText4}
          handleColumnClick={handleColumnClick}
          handleColumnMouseEnter={handleColumnMouseEnter}
          handleColumnMouseLeave={handleColumnMouseLeave}
        />
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<HomeProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  return { props: { locale, messages } };
};
