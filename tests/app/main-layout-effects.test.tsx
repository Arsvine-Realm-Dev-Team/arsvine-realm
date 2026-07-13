import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const align = vi.fn();
const cancel = vi.fn();
const isPending = vi.fn(() => false);

vi.mock('@/features/navigation/model/LayoutAnchorsContext', () => ({
  useLayoutAnchors: () => ({ align, cancel, isPending }),
}));

import { useContentHashAlignment } from '@/app/shell/useMainLayoutEffects';

afterEach(() => {
  align.mockReset();
  cancel.mockReset();
  isPending.mockReset();
  isPending.mockReturnValue(false);
  window.history.replaceState({}, '', '/zh-CN');
});

describe('useContentHashAlignment', () => {
  it('aligns an App Router content route from the current browser fragment', () => {
    window.history.replaceState({}, '', '/zh-TW/content#life');

    renderHook(() => useContentHashAlignment('/zh-TW/content', '/zh-TW/content'));

    expect(align).toHaveBeenCalledWith('life');
  });

  it('retains the Pages Router asPath fallback', () => {
    renderHook(() => useContentHashAlignment('/[locale]/content', '/en/content#blog'));

    expect(align).toHaveBeenCalledWith('blog');
  });
});
