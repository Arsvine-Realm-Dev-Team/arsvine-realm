import type { ReactNode } from 'react';

import MainLayout from './MainLayout';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return <MainLayout>{children}</MainLayout>;
}
