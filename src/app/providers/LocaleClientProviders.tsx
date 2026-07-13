'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import type { Locale } from '@/app/i18n/config';
import TelemetryRoot from '@/features/telemetry/public';
import { AppNavigationRuntime } from '@/features/navigation/model/AppNavigationRuntime';
import AppProviders from './AppProviders';
import AppShell from '../shell/AppShell';

interface LocaleClientProvidersProps {
  children: ReactNode;
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function LocaleClientProviders({
  children,
  locale,
  messages,
}: LocaleClientProvidersProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Shanghai"
      messages={messages}
      onError={() => {}}
      getMessageFallback={({ key }) => key}
    >
      <AppNavigationRuntime>
        <AppProviders>
          <AppShell locale={locale}>{children}</AppShell>
          <TelemetryRoot />
        </AppProviders>
      </AppNavigationRuntime>
    </NextIntlClientProvider>
  );
}
