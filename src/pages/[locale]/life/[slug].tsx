import type { GetStaticPaths, GetStaticProps } from 'next';
import LifeDetailPage, { type LifeDetailPageProps } from '../../../features/life/ui/LifeDetailPage';
import { getStaticCatalogAssets } from '../../../features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '../../../features/assets/server/catalog/hydrate-catalog-assets';
import { loadLife, loadMessages, resolveLifeItem } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';

export default LifeDetailPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const baseLife = loadLife(defaultLocale);
  const baseIds = [...baseLife.gameData, ...baseLife.travelData, ...baseLife.otherData].map((item) => item.id);
  return {
    paths: locales.flatMap((locale) => baseIds.map((slug) => ({ params: { locale, slug } }))),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<LifeDetailPageProps> = async ({ params }) => {
  const locale = params?.locale as Locale;
  const messages = await loadMessages(locale);
  const resolved = resolveLifeItem(params?.slug as string, locale);
  if (!resolved) return { notFound: true };

  const life = loadLife(locale);
  const catalogAssets = await getStaticCatalogAssets();
  const allItems = [...life.gameData, ...life.travelData, ...life.otherData];
  return {
    props: {
      locale,
      messages,
      item: hydrateCatalogAssets(resolved.item, catalogAssets),
      allItems: hydrateCatalogAssets(allItems, catalogAssets),
      translationStatus: resolved.status,
      actualLocale: resolved.actualLocale,
      originLocale: resolved.originLocale,
    },
    revalidate: 300,
  };
};
