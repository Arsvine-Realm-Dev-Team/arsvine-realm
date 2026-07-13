import type { Locale } from '@/shared/contracts/locale';

export function formatReadingTime(minutes: number, locale: Locale): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';

  switch (locale) {
    case 'zh-CN':
      return `约 ${minutes} 分钟`;
    case 'zh-TW':
      return `約 ${minutes} 分鐘`;
    default:
      return `${minutes} min read`;
  }
}
