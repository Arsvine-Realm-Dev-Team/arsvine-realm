import { makeLocaleRedirectGSSP } from '../../lib/redirect-helpers';

export default function PostsRedirectPage() {
  return null;
}

export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/content#blog`,
  permanent: false,
});
