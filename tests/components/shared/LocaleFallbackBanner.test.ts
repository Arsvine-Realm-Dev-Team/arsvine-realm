import { describe, expect, it } from 'vitest';

import { resolveLocaleFallbackBannerText } from '../../../components/shared/LocaleFallbackBanner';

describe('resolveLocaleFallbackBannerText', () => {
  it('uses the zh-CN fallback copy through an explicit allowlist branch', () => {
    expect(resolveLocaleFallbackBannerText('zh-CN', 'en', 'zh-CN', 'fallback')).toBe(
      '本页暂未提供 简体中文 译本，正在以 English 显示。',
    );
  });

  it('uses the en translated copy through an explicit allowlist branch', () => {
    expect(resolveLocaleFallbackBannerText('en', 'en', 'zh-TW', 'translated')).toBe(
      'This page is translated from 繁體中文.',
    );
  });
});
