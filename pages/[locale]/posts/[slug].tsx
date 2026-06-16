import type { GetServerSideProps } from 'next';
import { localeAwareRedirect } from '../../../lib/redirect-helpers';

export default function PostSlugRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!slug) {
    return localeAwareRedirect(params, {
      destination: (locale) => `/${locale}/content#blog`,
      permanent: false,
    });
  }

  return localeAwareRedirect(params, {
    destination: (locale) => `/${locale}/blog/${slug}`,
    permanent: false,
  });
};
