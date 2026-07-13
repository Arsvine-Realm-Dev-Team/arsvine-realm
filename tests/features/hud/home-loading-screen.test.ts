import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import { collectGsapTargets } from '@/features/hud/ui/loading/HomeLoadingScreen';
import HomeLoadingScreen from '@/features/hud/ui/loading/HomeLoadingScreen';
import { completeInitialBootSequence } from '@/features/hud/model/homeLoadingSession';

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudPerformance: () => ({ allowDecorativeMotion: true }),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useReducedMotion: () => false,
  useResponsive: () => ({ isMobile: false }),
}));

describe('collectGsapTargets', () => {
  it('filters null and undefined targets before passing them to GSAP', () => {
    const nodeA = {} as HTMLDivElement;
    const nodeB = {} as HTMLDivElement;

    expect(collectGsapTargets([nodeA, null, undefined, nodeB])).toEqual([nodeA, nodeB]);
  });
});

describe('HomeLoadingScreen session remount', () => {
  it('notifies a remounted HUD when the document boot sequence is already complete', async () => {
    completeInitialBootSequence();
    const onComplete = vi.fn();
    const { rerender } = render(createElement(HomeLoadingScreen, { onComplete }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

    rerender(createElement(HomeLoadingScreen, { onComplete }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
