import Head from 'next/head';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import TweetsSection from './TweetsSection';
import HreflangLinks from '../../../shared/ui/HreflangLinks';
import { getSiteUrl } from '@/shared/config/site';
import type { Locale } from '@/shared/contracts/locale';
import type { TweetMonthGroup } from '../model/types';

export interface TweetsPageProps {
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
