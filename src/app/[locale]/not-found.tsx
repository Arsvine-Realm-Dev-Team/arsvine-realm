import type { Metadata } from 'next';

import NotFoundView from '@/features/navigation/ui/NotFoundView';
import { siteConfig } from '@/shared/config/site';

export const metadata: Metadata = {
  title: `404 | ${siteConfig.metaTitle}`,
  robots: { index: false, follow: true },
};

export default function LocaleNotFound() {
  return <NotFoundView />;
}
