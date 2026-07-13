import { makeLocaleRedirectGSSP } from '@/app/routing/localeRedirect';

export default function LifeRedirect() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#life`,
  permanent: false,
});
