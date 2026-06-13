import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../components/layout/SectionPageLayout';
import TweetsSection from '../../components/sections/TweetsSection';
import HreflangLinks from '../../components/shared/HreflangLinks';
import { getSiteUrl } from '../../data/site';
import { locales, type Locale } from '../../i18n/config';
import { loadMessages } from '../../lib/i18n-data';
import { getTweetMonthGroupsPage } from '../../lib/tweets/github';
import type { TweetMonthGroup } from '../../lib/tweets/types';

const INITIAL_MONTH_BATCH_SIZE = 1;

interface TweetsPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  monthGroups: TweetMonthGroup[];
  totalMonths: number;
  monthBatchSize: number;
  generatedAt: string;
}

export default function TweetsPage({
  locale,
  monthGroups,
  totalMonths,
  monthBatchSize,
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
          totalMonths={totalMonths}
          monthBatchSize={monthBatchSize}
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
  const { monthGroups, totalMonths } = await getTweetMonthGroupsPage(0, INITIAL_MONTH_BATCH_SIZE);

  return {
    props: {
      locale,
      messages,
      monthGroups,
      totalMonths,
      monthBatchSize: INITIAL_MONTH_BATCH_SIZE,
      generatedAt: new Date().toISOString(),
    },
    revalidate: 300,
  };
};
