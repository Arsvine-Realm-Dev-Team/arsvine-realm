import type { GetServerSideProps } from 'next';

// /[locale]/license 永久重定向到 /[locale]/copyright（两者是同一页内容）
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const locale = params?.locale as string | undefined;
  return {
    redirect: {
      destination: locale ? `/${locale}/copyright` : '/copyright',
      permanent: true,
    },
  };
};

export default function LicenseRedirect() {
  return null;
}
