import type { GetStaticPaths, GetStaticProps } from 'next';
import WebDetailPage, { type WebDetailPageProps } from '../../../features/portfolio/ui/WebDetailPage';
import { getStaticCatalogAssets } from '../../../features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '../../../features/assets/server/catalog/hydrate-catalog-assets';
import { loadProjects, loadMessages, resolveWebProject } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';

export default WebDetailPage;

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.flatMap((locale) => loadProjects(defaultLocale).webProjects.map((project) => ({
    params: { locale, id: String(project.id) },
  }))),
  fallback: false,
});

export const getStaticProps: GetStaticProps<WebDetailPageProps> = async ({ params }) => {
  const locale = params?.locale as Locale;
  const messages = await loadMessages(locale);
  const resolved = resolveWebProject(Number(params?.id), locale);
  if (!resolved) return { notFound: true };

  const projectsModule = loadProjects(locale);
  const catalogAssets = await getStaticCatalogAssets();
  return {
    props: {
      locale,
      messages,
      project: hydrateCatalogAssets(resolved.project, catalogAssets),
      webProjects: hydrateCatalogAssets(projectsModule.webProjects, catalogAssets),
      copyableTokens: projectsModule.copyableTokens,
      translationStatus: resolved.status,
      actualLocale: resolved.actualLocale,
      originLocale: resolved.originLocale,
    },
    revalidate: 300,
  };
};
