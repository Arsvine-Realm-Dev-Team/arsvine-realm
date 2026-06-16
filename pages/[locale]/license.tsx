import { makeLocaleRedirectGSSP } from '../../lib/redirect-helpers';

// /[locale]/license 永久重定向到 /[locale]/copyright（两者是同一页内容）
export const getServerSideProps = makeLocaleRedirectGSSP({
  destination: (locale) => `/${locale}/copyright`,
  permanent: true,
});

export default function LicenseRedirect() {
  return null;
}
