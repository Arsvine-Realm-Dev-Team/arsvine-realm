import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useAdaptivePerformance from '@/features/hud/model/useAdaptivePerformance';

const matchesByQuery: Map<string, boolean> = new Map();
const listenersByQuery: Map<string, Set<(event: MediaQueryListEvent) => void>> = new Map();
const originalConnectionDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'connection');
const originalDeviceMemoryDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'deviceMemory');
const originalHardwareConcurrencyDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'hardwareConcurrency');

let nextRafId = 0;
let rafCallbacks: Map<number, FrameRequestCallback>;

class MockMediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

  constructor(media: string) {
    this.media = media;
  }

  get matches(): boolean {
    return matchesByQuery.get(this.media) ?? false;
  }

  addEventListener(_type: 'change', listener: (ev: MediaQueryListEvent) => void): void {
    let set = listenersByQuery.get(this.media);
    if (!set) {
      set = new Set();
      listenersByQuery.set(this.media, set);
    }
    set.add(listener);
  }

  removeEventListener(_type: 'change', listener: (ev: MediaQueryListEvent) => void): void {
    listenersByQuery.get(this.media)?.delete(listener);
  }
}

function fireMediaQueryChange(query: string) {
  const listeners = listenersByQuery.get(query);
  if (!listeners) return;
  for (const listener of [...listeners]) {
    listener({ matches: matchesByQuery.get(query) ?? false, media: query } as MediaQueryListEvent);
  }
}

function setNavigatorProperty(key: 'connection' | 'deviceMemory' | 'hardwareConcurrency', value: unknown) {
  Object.defineProperty(window.navigator, key, {
    configurable: true,
    value,
  });
}

function restoreNavigatorProperty(
  key: 'connection' | 'deviceMemory' | 'hardwareConcurrency',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(window.navigator, key, descriptor);
    return;
  }

  delete (window.navigator as unknown as Record<string, unknown>)[key];
}

function flushNextAnimationFrame(timestamp: number) {
  const nextEntry = rafCallbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
  if (!nextEntry) {
    throw new Error('No queued animation frame callback to flush.');
  }

  const [id, callback] = nextEntry;
  rafCallbacks.delete(id);
  act(() => {
    callback(timestamp);
  });
}

beforeEach(() => {
  matchesByQuery.clear();
  listenersByQuery.clear();
  rafCallbacks = new Map();
  nextRafId = 0;

  vi.stubGlobal('matchMedia', (query: string) => new MockMediaQueryList(query));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextRafId += 1;
    rafCallbacks.set(nextRafId, callback);
    return nextRafId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });

  matchesByQuery.set('(prefers-reduced-motion: reduce)', false);
  setNavigatorProperty('connection', { saveData: false, effectiveType: '4g' });
  setNavigatorProperty('deviceMemory', 8);
  setNavigatorProperty('hardwareConcurrency', 8);
  document.documentElement.removeAttribute('data-performance-tier');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreNavigatorProperty('connection', originalConnectionDescriptor);
  restoreNavigatorProperty('deviceMemory', originalDeviceMemoryDescriptor);
  restoreNavigatorProperty('hardwareConcurrency', originalHardwareConcurrencyDescriptor);
  document.documentElement.removeAttribute('data-performance-tier');
});

describe('useAdaptivePerformance', () => {
  it('reduces immediately for prefers-reduced-motion', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', true);

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('minimal');
    expect(result.current.performanceReason).toBe('reduced-motion');
    expect(result.current.allowDecorativeMotion).toBe(false);
    expect(document.documentElement.getAttribute('data-performance-tier')).toBe('minimal');
  });

  it('reduces immediately when saveData or 2g effective type is reported', () => {
    setNavigatorProperty('connection', { saveData: true, effectiveType: '4g' });

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('reduced');
    expect(result.current.performanceReason).toBe('device-heuristic');
  });

  it('reduces immediately when the network effective type is 3g', () => {
    setNavigatorProperty('connection', { saveData: false, effectiveType: '3g' });

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('reduced');
    expect(result.current.performanceReason).toBe('device-heuristic');
  });

  it('reduces immediately for low device memory or low CPU concurrency', () => {
    setNavigatorProperty('deviceMemory', 4);

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('balanced');
    expect(result.current.performanceReason).toBe('device-heuristic');
  });

  it('reduces after runtime FPS sampling on weak frame pacing', () => {
    const { result } = renderHook(() => useAdaptivePerformance(true));

    expect(result.current.performanceTier).toBe('full');

    flushNextAnimationFrame(0);
    for (let frame = 1; frame <= 127; frame += 1) {
      flushNextAnimationFrame(frame * 40);
    }

    expect(result.current.performanceTier).toBe('balanced');
    expect(result.current.performanceReason).toBe('runtime-fps');
  });

  it('stays reduced after the triggering condition goes away', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', true);
    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('minimal');

    matchesByQuery.set('(prefers-reduced-motion: reduce)', false);
    act(() => {
      fireMediaQueryChange('(prefers-reduced-motion: reduce)');
    });

    expect(result.current.performanceTier).toBe('minimal');
    expect(result.current.performanceReason).toBe('reduced-motion');
  });
});
