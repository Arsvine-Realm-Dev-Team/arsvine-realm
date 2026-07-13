import type { GetStaticPaths, GetStaticProps } from 'next';
import TweetsPage, { type TweetsPageProps } from '../../features/tweets/ui/TweetsPage';
import { getTweetMonthGroupsPage } from '../../features/tweets/server/github';
import { locales, type Locale } from '@/app/i18n/config';
import { loadMessages } from '@/app/i18n/data';

const INITIAL_MONTH_BATCH_SIZE = 1;

export default TweetsPage;

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<TweetsPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  try {
    const { monthGroups, totalMonths } = await getTweetMonthGroupsPage(0, INITIAL_MONTH_BATCH_SIZE);
    return {
      props: { locale, messages, monthGroups, totalMonths, monthBatchSize: INITIAL_MONTH_BATCH_SIZE, generatedAt: new Date().toISOString() },
      revalidate: 300,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    console.error('[tweets] source unavailable in development:', error);
    return {
      props: {
        locale, messages, monthGroups: [], totalMonths: 0, monthBatchSize: INITIAL_MONTH_BATCH_SIZE,
        generatedAt: new Date().toISOString(), sourceUnavailable: true,
        sourceError: error instanceof Error ? error.message : 'tweets_source_unavailable',
      },
      revalidate: 300,
    };
  }
};
