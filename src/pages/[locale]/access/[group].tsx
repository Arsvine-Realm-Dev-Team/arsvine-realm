import type { GetServerSideProps } from 'next';
import AccessPage, { type AccessPageProps } from '../../../features/blog/ui/blog/AccessPage';
import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import { getTotpGroup } from '@/shared/lib/content/totp';
import { loadMessages } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';

export default AccessPage;

export const getServerSideProps: GetServerSideProps<AccessPageProps> = async ({ params, query, req }) => {
  const locale = (params?.locale as Locale) || defaultLocale;
  const group = typeof params?.group === 'string' ? params.group : '';
  const nextPath = typeof query.next === 'string' && query.next.startsWith('/')
    ? query.next
    : `/${locale}/content#blog`;
  if (!locales.includes(locale) || !group || !getTotpGroup(group)) return { notFound: true };
  if (hasValidAccessGrant(req, group)) return { redirect: { destination: nextPath, permanent: false } };
  return { props: { locale, messages: await loadMessages(locale), group, nextPath } };
};
