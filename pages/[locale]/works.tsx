import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { locales, type Locale } from '../../i18n/config';

export default function WorksRedirect() {
  const router = useRouter();
  useEffect(() => {
    const locale = router.query.locale as string | undefined;
    if (locale) router.replace(`/${locale}/content#works`);
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
