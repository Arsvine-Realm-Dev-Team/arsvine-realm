import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvTelemetryController } from '@/features/hud/model/envTelemetryController';

describe('EnvTelemetryController', () => {
  let now = 100;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 100;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createController() {
    return new EnvTelemetryController({ now: () => now, random: () => 0.25 });
  }

  it('boots, pauses atomically for route visibility, and resumes pending work', () => {
    const controller = createController();
    controller.start();
    vi.advanceTimersByTime(1000);

    expect(controller.getSnapshot().envData).not.toBeNull();
    expect(controller.getSnapshot().isEnvParamsTyping).toBe(true);

    controller.setRouteEnabled(false);
    expect(controller.getSnapshot().isEnvParamsTyping).toBe(false);
    vi.advanceTimersByTime(5000);

    controller.setRouteEnabled(true);
    expect(controller.getSnapshot().isEnvParamsTyping).toBe(true);
  });

  it('applies visibility return gain and scroll cooldown without duplicate gains', () => {
    const controller = createController();
    controller.start();
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(6500);

    now = 1000;
    controller.visibilityChanged(true);
    now = 17000;
    controller.visibilityChanged(false);
    expect(controller.getSnapshot().envArtifactStage).toBe(0);

    now = 21000;
    controller.scrolled();
    controller.dwell();
    const stageAfterScroll = controller.getSnapshot().envArtifactStage;
    expect(stageAfterScroll).toBe(1);
    now = 22000;
    controller.scrolled();
    expect(controller.getSnapshot().envArtifactStage).toBe(stageAfterScroll);
  });

  it('clears scheduled work and resets the external-store snapshot on stop', () => {
    const controller = createController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.start();
    vi.advanceTimersByTime(1000);
    expect(controller.getSnapshot().envDataVersion).toBe(1);

    controller.stop();
    vi.runOnlyPendingTimers();

    expect(controller.getSnapshot()).toEqual({
      displayedEnvParams: '',
      isEnvParamsTyping: false,
      envData: null,
      envDataVersion: 0,
      envArtifactStage: 0,
    });
    expect(listener).toHaveBeenCalled();
  });
});
