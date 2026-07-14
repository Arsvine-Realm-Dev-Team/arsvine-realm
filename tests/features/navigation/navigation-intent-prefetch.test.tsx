import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prefetchMock } = vi.hoisted(() => ({
  prefetchMock: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({ prefetch: prefetchMock }),
}));

import useNavigationIntentPrefetch from '@/features/navigation/model/useNavigationIntentPrefetch';

const originalNodeEnv = process.env.NODE_ENV;

describe('useNavigationIntentPrefetch', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    prefetchMock.mockReset();
    prefetchMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  });

  it('prefetches each URL once after navigation intent', () => {
    const { result } = renderHook(() => useNavigationIntentPrefetch());

    act(() => {
      result.current('/en/content');
      result.current('/en/content');
    });

    expect(prefetchMock).toHaveBeenCalledTimes(1);
    expect(prefetchMock).toHaveBeenCalledWith('/en/content');
  });

  it('allows a retry after a rejected prefetch', async () => {
    prefetchMock.mockRejectedValueOnce(new Error('network unavailable'));
    const { result } = renderHook(() => useNavigationIntentPrefetch());

    await act(async () => {
      result.current('/en/content');
      await Promise.resolve();
    });
    act(() => result.current('/en/content'));

    expect(prefetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not prefetch in development', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const { result } = renderHook(() => useNavigationIntentPrefetch());

    act(() => result.current('/en/content'));

    expect(prefetchMock).not.toHaveBeenCalled();
  });
});
