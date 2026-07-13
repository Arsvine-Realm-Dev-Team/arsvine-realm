import type { GetStaticPaths, GetStaticProps } from 'next';
import FriendsPage, { type FriendsPageProps } from '../../features/profile/ui/FriendsPage';
import { getStaticCatalogAssets } from '../../features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '../../features/assets/server/catalog/hydrate-catalog-assets';
import { loadFriendLinks, loadServices, loadMessages } from '@/app/i18n/data';
import { locales, type Locale } from '@/app/i18n/config';

export default FriendsPage;
export const getStaticPaths: GetStaticPaths = async () => ({ paths: locales.map((locale) => ({ params: { locale } })), fallback: false });
export const getStaticProps: GetStaticProps<FriendsPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const [messages, catalogAssets] = await Promise.all([loadMessages(locale), getStaticCatalogAssets()]);
  const friendsPage = (messages.pages as Record<string, { title?: string; description?: string }>)?.friends ?? {};
  return {
    props: {
      locale, messages,
      friends: hydrateCatalogAssets(loadFriendLinks(locale).friendLinksData, catalogAssets),
      services: loadServices(), pageTitle: friendsPage.title ?? 'FRIENDS', pageDescription: friendsPage.description ?? '',
    }, revalidate: 300,
  };
};
