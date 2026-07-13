import { makeLocaleRedirectGSSP } from '@/app/routing/localeRedirect';

export default function ContactRedirect() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#contact`,
  permanent: false,
});
