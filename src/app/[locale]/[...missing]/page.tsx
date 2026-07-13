import { notFound } from 'next/navigation';

/**
 * Keep unresolved locale-prefixed URLs inside the locale layout so the
 * HUD-aware not-found boundary can render with its providers and translations.
 */
export default function MissingLocaleRoute() {
  notFound();
}
