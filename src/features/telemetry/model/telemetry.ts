export type TelemetryProperties = Record<string, string | number | boolean | null>;

export function trackTelemetryEvent(name: string, properties?: TelemetryProperties): void {
  if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_TELEMETRY_PROVIDER !== 'vercel') return;
  void import('@vercel/analytics')
    .then(({ track }) => track(name, properties))
    .catch((error: unknown) => {
      if (process.env.NODE_ENV !== 'production') console.warn('[telemetry] event failed', error);
    });
}
