import { redirect } from 'next/navigation';

export default async function ContactRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/content#contact`);
}
