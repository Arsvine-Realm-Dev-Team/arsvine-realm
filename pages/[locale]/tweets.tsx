import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../components/layout/SectionPageLayout';
import TweetsSection from '../../components/sections/TweetsSection';
import HreflangLinks from '../../components/shared/HreflangLinks';
import { getSiteUrl } from '../../data/site';
import { locales, type Locale } from '../../i18n/config';
import { loadMessages } from '../../lib/i18n-data';
import { getTweetMonthGroups } from '../../lib/tweets/github';
import type { TweetMonthGroup } from '../../lib/tweets/types';

const INITIAL_VISIBLE_MONTHS = 1;

interface TweetsPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  monthGroups: TweetMonthGroup[];
  initialVisibleMonths: number;
  generatedAt: string;
}

export default function TweetsPage({
  locale,
  monthGroups,
  initialVisibleMonths,
  generatedAt,
}: TweetsPageProps) {
  const t = useTranslations('pages.tweets');

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta name="description" content={t('description')} />
        <meta property="og:title" content={t('title')} />
        <meta property="og:description" content={t('description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/tweets`} />
        <HreflangLinks basePath="/tweets" />
      </Head>

      <SectionPageLayout>
        <TweetsSection
          locale={locale}
          monthGroups={monthGroups}
          initialVisibleMonths={initialVisibleMonths}
          generatedAt={generatedAt}
        />
      </SectionPageLayout>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<TweetsPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  const monthGroups = await getTweetMonthGroups();

  return {
    props: {
      locale,
      messages,
      monthGroups,
      initialVisibleMonths: Math.min(INITIAL_VISIBLE_MONTHS, monthGroups.length || INITIAL_VISIBLE_MONTHS),
      generatedAt: new Date().toISOString(),
    },
    revalidate: 300,
  };
};
