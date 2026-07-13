import type { GetStaticPaths, GetStaticProps } from 'next';
import CopyrightPage, { type CopyrightPageProps } from '../../features/profile/ui/CopyrightPage';
import { loadMessages } from '@/app/i18n/data';
import { locales, type Locale } from '@/app/i18n/config';

export default CopyrightPage;
export const getStaticPaths: GetStaticPaths = async () => ({ paths: locales.map((locale) => ({ params: { locale } })), fallback: false });
export const getStaticProps: GetStaticProps<CopyrightPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  return { props: { locale, messages: await loadMessages(locale) } };
};
