/**
 * LocaleFallbackBanner — 翻译状态提示横幅。
 *
 *  - status='fallback'    本页缺译，已用 actualLocale 兜底显示 → 警示风格，30s 自动消失
 *  - status='translated'  本页是从 originLocale 翻译而来 → 信息风格，5s 自动消失
 *  - status='source'      原文 locale，不渲染
 */
import { useCallback, useEffect, useState } from 'react';
import styles from './LocaleFallbackBanner.module.scss';
import { localeNativeName, type Locale } from '../../i18n/config';
import type { TranslationStatus } from '../../types';

interface Props {
  requestedLocale: Locale;
  actualLocale: Locale;
  /** 内容原文 locale，仅在 status='translated' 时用于文案。可选；不传退回 actualLocale。 */
  originLocale?: Locale;
  /** 翻译状态。未传时按旧逻辑（requested != actual 即视为 fallback）兼容。 */
  status?: TranslationStatus;
}

const FALLBACK_AUTO_DISMISS_MS = 30000;
const TRANSLATED_AUTO_DISMISS_MS = 5000;
const EXIT_ANIMATION_MS = 240;

const FALLBACK_TEXT: Record<Locale, (requested: string, actual: string) => string> = {
  'zh-CN': (req, act) => `本页暂未提供 ${req} 译本，正在以 ${act} 显示。`,
  'zh-TW': (req, act) => `本頁尚未提供 ${req} 譯本，目前以 ${act} 顯示。`,
  en: (req, act) => `This page is not yet available in ${req}. Showing ${act} instead.`,
};

const TRANSLATED_TEXT: Record<Locale, (origin: string) => string> = {
  'zh-CN': (origin) => `本页内容译自${origin}。`,
  'zh-TW': (origin) => `本頁內容譯自${origin}。`,
  en: (origin) => `This page is translated from ${origin}.`,
};

const CLOSE_LABEL: Record<Locale, string> = {
  'zh-CN': '关闭提示',
  'zh-TW': '關閉提示',
  en: 'Dismiss notice',
};

export function resolveLocaleFallbackBannerText(
  requestedLocale: Locale,
  actualLocale: Locale,
  originLocale: Locale,
  status: Exclude<TranslationStatus, 'source'>,
) {
  switch (requestedLocale) {
    case 'zh-CN':
      return status === 'fallback'
        ? FALLBACK_TEXT['zh-CN'](localeNativeName['zh-CN'], localeNativeName[actualLocale])
        : TRANSLATED_TEXT['zh-CN'](localeNativeName[originLocale]);
    case 'zh-TW':
      return status === 'fallback'
        ? FALLBACK_TEXT['zh-TW'](localeNativeName['zh-TW'], localeNativeName[actualLocale])
        : TRANSLATED_TEXT['zh-TW'](localeNativeName[originLocale]);
    case 'en':
      return status === 'fallback'
        ? FALLBACK_TEXT.en(localeNativeName.en, localeNativeName[actualLocale])
        : TRANSLATED_TEXT.en(localeNativeName[originLocale]);
  }
}

export default function LocaleFallbackBanner({ requestedLocale, actualLocale, originLocale, status }: Props) {
  // 显式 status 优先；缺省时按旧逻辑兼容（防止旧调用方一次性全断）。
  // 兼容路径里不区分 translated，只表达 fallback。
  const effectiveStatus: TranslationStatus = status
    ?? (requestedLocale !== actualLocale ? 'fallback' : 'source');

  if (effectiveStatus === 'source') return null;

  return (
    <LocaleFallbackBannerContent
      key={`${effectiveStatus}:${requestedLocale}:${actualLocale}:${originLocale ?? ''}`}
      requestedLocale={requestedLocale}
      actualLocale={actualLocale}
      originLocale={originLocale ?? actualLocale}
      status={effectiveStatus}
    />
  );
}

interface ContentProps {
  requestedLocale: Locale;
  actualLocale: Locale;
  originLocale: Locale;
  status: Exclude<TranslationStatus, 'source'>;
}

function LocaleFallbackBannerContent({ requestedLocale, actualLocale, originLocale, status }: ContentProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const dismiss = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setIsVisible(false);
    }, EXIT_ANIMATION_MS);
  }, [isClosing]);

  useEffect(() => {
    if (!isVisible) return;
    const delay = status === 'fallback' ? FALLBACK_AUTO_DISMISS_MS : TRANSLATED_AUTO_DISMISS_MS;
    const timer = window.setTimeout(() => {
      dismiss();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [dismiss, isVisible, status]);

  if (!isVisible) return null;

  const text = resolveLocaleFallbackBannerText(requestedLocale, actualLocale, originLocale, status);

  const variantClass = status === 'fallback' ? styles.fallback : styles.translated;
  const icon = status === 'fallback' ? '⚠' : 'ℹ';

  return (
    <div className={`${styles.banner} ${variantClass} ${isClosing ? styles.closing : ''}`}>
      <span className={styles.bannerIcon}>{icon}</span>
      <span className={styles.bannerText} role="status" aria-live="polite">
        {text}
      </span>
      <button
        type="button"
        className={styles.closeButton}
        onClick={dismiss}
        aria-label={CLOSE_LABEL[requestedLocale]}
      >
        ×
      </button>
    </div>
  );
}
