import type { ReactNode } from 'react';

import MainLayout from './MainLayout';
import type { Locale } from '@/app/i18n/config';

interface AppShellProps {
  children: ReactNode;
  locale: Locale;
}

export default function AppShell({ children, locale }: AppShellProps) {
  return <MainLayout appLocale={locale}>{children}</MainLayout>;
}
