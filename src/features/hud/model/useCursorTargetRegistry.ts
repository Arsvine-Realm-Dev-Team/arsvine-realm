import { useEffect, useRef, type RefObject } from 'react';

import {
  collectInteractiveElements,
  getInteractiveCursorTarget,
} from '../ui/cursor/customCursorShared';
import { subscribeCursorTargetsDirty } from '@/shared/lib/cursor-targets';

interface UseCursorTargetRegistryOptions {
  hoverElRef: RefObject<HTMLElement | null>;
  onEnter: (element: HTMLElement) => void;
  onLeave: (event: MouseEvent, currentTarget: HTMLElement) => void;
  onHoverTargetRemoved: () => void;
}

export default function useCursorTargetRegistry({
  hoverElRef,
  onEnter,
  onLeave,
  onHoverTargetRemoved,
}: UseCursorTargetRegistryOptions) {
  const interactiveElsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const refreshTargets = () => {
      interactiveElsRef.current = collectInteractiveElements();
      if (hoverElRef.current && !hoverElRef.current.isConnected) {
        onHoverTargetRemoved();
      }
    };

    const handleEnter = (event: Event) => {
      const target = getInteractiveCursorTarget(event.target);
      if (!target || target === hoverElRef.current) {
        return;
      }
      if (!interactiveElsRef.current.includes(target)) {
        refreshTargets();
      }
      onEnter(target);
    };

    const handleLeave = (event: Event) => {
      const target = getInteractiveCursorTarget(event.target);
      if (!target) {
        return;
      }
      onLeave(event as MouseEvent, target);
    };

    refreshTargets();
    document.addEventListener('mouseover', handleEnter, true);
    document.addEventListener('mouseout', handleLeave, true);
    window.addEventListener('resize', refreshTargets);
    const unsubscribeDirty = subscribeCursorTargetsDirty(refreshTargets);

    return () => {
      document.removeEventListener('mouseover', handleEnter, true);
      document.removeEventListener('mouseout', handleLeave, true);
      window.removeEventListener('resize', refreshTargets);
      unsubscribeDirty();
    };
  }, [hoverElRef, onEnter, onHoverTargetRemoved, onLeave]);

  return interactiveElsRef;
}
