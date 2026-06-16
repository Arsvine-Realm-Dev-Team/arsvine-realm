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
  sourceUnavailable?: boolean;
  sourceError?: string | null;
}

export default function TweetsPage({
  locale,
  monthGroups,
  totalMonths,
  monthBatchSize,
  generatedAt,
  sourceUnavailable,
  sourceError,
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
        <meta name="twitter:title" content={t('title')} />
        <meta name="twitter:description" content={t('description')} />
        <HreflangLinks basePath="/tweets" />
      </Head>

      <SectionPageLayout>
        <TweetsSection
          locale={locale}
          monthGroups={monthGroups}
          totalMonths={totalMonths}
          monthBatchSize={monthBatchSize}
          generatedAt={generatedAt}
          sourceUnavailable={sourceUnavailable}
          sourceError={sourceError}
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
  const isProduction = process.env.NODE_ENV === 'production';

  try {
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
  } catch (error) {
    // 生产环境继续抛错，确保 ISR 失败时保留上一版成功缓存；
    // 本地开发则降级为页面内提示，避免整个页面直接 500。
    if (isProduction) {
      throw error;
    }

    console.error('[tweets] source unavailable in development:', error);

    return {
      props: {
        locale,
        messages,
        monthGroups: [],
        totalMonths: 0,
        monthBatchSize: INITIAL_MONTH_BATCH_SIZE,
        generatedAt: new Date().toISOString(),
        sourceUnavailable: true,
        sourceError: error instanceof Error ? error.message : 'tweets_source_unavailable',
      },
      revalidate: 300,
    };
  }
};
