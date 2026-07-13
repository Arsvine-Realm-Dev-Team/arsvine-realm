import { makeLocaleRedirectGSSP } from '@/app/routing/localeRedirect';

export default function WorksRedirect() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#works`,
  permanent: false,
});
