import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('home loading session', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('runs the opening sequence once for each browser document', async () => {
    const session = await import('@/features/hud/model/homeLoadingSession');

    expect(session.isInitialBootSequencePending()).toBe(true);

    session.completeInitialBootSequence();

    expect(session.isInitialBootSequencePending()).toBe(false);
  });
});
