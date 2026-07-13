import type { GetStaticPaths, GetStaticProps } from 'next';
import ContentPage, { type ContentPageProps } from '../../features/navigation/ui/ContentPage';
import { getAllPostsForLocale } from '../../features/blog/server/blog';
import { getStaticCatalogAssets } from '../../features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '../../features/assets/server/catalog/hydrate-catalog-assets';
import { loadProjects, loadLife, loadExperience, loadSkills, loadMessages } from '@/app/i18n/data';
import { locales, type Locale } from '@/app/i18n/config';

export default ContentPage;
export const getStaticPaths: GetStaticPaths = async () => ({ paths: locales.map((locale) => ({ params: { locale } })), fallback: false });
export const getStaticProps: GetStaticProps<ContentPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const [messages, blogPosts, catalogAssets] = await Promise.all([
    loadMessages(locale), getAllPostsForLocale(locale), getStaticCatalogAssets(),
  ]);
  const projects = loadProjects(locale);
  const life = loadLife(locale);
  const exp = loadExperience(locale);
  const skills = loadSkills(locale);
  return {
    props: {
      locale, messages, blogPosts,
      webProjects: hydrateCatalogAssets(projects.webProjects, catalogAssets),
      gameProjects: hydrateCatalogAssets(projects.gameProjects, catalogAssets),
      earlyProjects: hydrateCatalogAssets(projects.earlyProjects, catalogAssets),
      experienceData: hydrateCatalogAssets(exp.experienceData, catalogAssets),
      gameData: hydrateCatalogAssets(life.gameData, catalogAssets),
      travelData: hydrateCatalogAssets(life.travelData, catalogAssets),
      otherData: hydrateCatalogAssets(life.otherData, catalogAssets),
      alsoPlayGames: life.alsoPlayGames, artPlaceholderText: life.artPlaceholderText,
      skillCategories: skills.skillCategories,
      pageDescription: (messages.pages as Record<string, { description?: string }>)?.content?.description ?? '',
    }, revalidate: 300,
  };
};
