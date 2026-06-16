import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { locales, type Locale } from '../../i18n/config';
import { buildLocaleRedirectPath } from '../../lib/redirect-helpers';

export default function BlogRedirect() {
  const router = useRouter();
  useEffect(() => {
    const dest = buildLocaleRedirectPath(router.query as Record<string, string | string[] | undefined>, (l) => `/${l}/content#blog`);
    router.replace(dest);
  }, [router]);
  return null;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const locale = params!.locale as Locale;
  return { props: { locale } };
};
