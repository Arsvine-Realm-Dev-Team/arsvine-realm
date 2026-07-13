import { makeLocaleRedirectGSSP } from '@/app/routing/localeRedirect';

export default function ExperienceRedirect() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#experience`,
  permanent: false,
});
