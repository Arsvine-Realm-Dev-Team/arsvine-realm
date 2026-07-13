import { makeLocaleRedirectGSSP } from '@/app/routing/localeRedirect';

export default function AboutRedirect() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#about`,
  permanent: false,
});
