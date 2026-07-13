/**
 * LanguageSwitcher — HUD 风格三语切换器。
 * 集成在 GlobalHud 右上区域，单击切换 locale 并把当前 locale 写入
 * NEXT_LOCALE cookie，便于下次裸路径访问时直接命中。
 */
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import styles from './LanguageSwitcher.module.scss';
import { getLocaleFromPath, isLocale, locales, localeShortLabel, type Locale } from '@/shared/contracts/locale';

interface LanguageSwitcherProps {
  currentLocale?: Locale;
}

export default function LanguageSwitcher({ currentLocale: currentLocaleProp }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathWithoutQuery = router.asPath.split('?')[0];
  const currentLocale: Locale | undefined = currentLocaleProp
    ?? (isLocale(router.query.locale) ? router.query.locale : getLocaleFromPath(router.asPath));

  const setLocale = useCallback((nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;
    // 写 cookie，180 天后过期
    document.cookie = `NEXT_LOCALE=${nextLocale}; max-age=${60 * 60 * 24 * 180}; path=/; samesite=lax`;
    const currentVisiblePath = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : router.asPath;
    const nextPath = currentLocale
      ? currentVisiblePath.replace(new RegExp(`^/${currentLocale}(?=/|$)`), `/${nextLocale}`)
      : `/${nextLocale}${pathWithoutQuery === '/' ? '' : pathWithoutQuery}`;
    router.push(nextPath, undefined, { scroll: false });
  }, [currentLocale, pathWithoutQuery, router]);

  return (
    <div className={styles.switcher} aria-label="Language switcher">
      {locales.map((loc, idx) => (
        <span key={loc} className={styles.switcherGroup}>
          <button
            type="button"
            className={`${styles.switcherButton} ${loc === currentLocale ? styles.active : ''}`}
            onClick={() => setLocale(loc)}
            data-cursor-label={loc}
          >
            {localeShortLabel[loc]}
          </button>
          {idx < locales.length - 1 && <span className={styles.switcherDivider}>│</span>}
        </span>
      ))}
    </div>
  );
}
