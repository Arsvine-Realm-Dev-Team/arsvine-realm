import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useCursorTargetRegistry from '@/features/hud/model/useCursorTargetRegistry';
import { markCursorTargetsDirty } from '@/shared/lib/cursor-targets';

vi.mock('@/features/hud/ui/cursor/customCursorShared', () => ({
  collectInteractiveElements: () => [],
  getInteractiveCursorTarget: () => null,
}));

describe('cursor target registry', () => {
  it('notifies the cursor reset callback when the active target disappears', () => {
    const target = document.createElement('button');
    document.body.append(target);
    const onHoverTargetRemoved = vi.fn();

    function Harness() {
      const hoverElRef = { current: target };
      const interactiveElsRef = { current: [] as HTMLElement[] };
      useCursorTargetRegistry({
        interactiveElsRef,
        hoverElRef,
        onEnter: vi.fn(),
        onLeave: vi.fn(),
        onHoverTargetRemoved,
      });
      return null;
    }

    render(<Harness />);
    target.remove();
    markCursorTargetsDirty();

    expect(onHoverTargetRemoved).toHaveBeenCalledOnce();
  });
});
