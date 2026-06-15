import { useEffect, useRef, type MutableRefObject } from 'react';

import { collectInteractiveElements } from '../components/interactive/customCursorShared';

interface UseCursorTargetRegistryOptions {
  hoverElRef: MutableRefObject<HTMLElement | null>;
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
    let currentEls: HTMLElement[] = [];
    let debounceTimer = 0;

    const handleEnter = (event: Event) => {
      onEnter(event.currentTarget as HTMLElement);
    };

    const handleLeave = (event: Event) => {
      onLeave(event as MouseEvent, event.currentTarget as HTMLElement);
    };

    const unbind = () => {
      currentEls.forEach((element) => {
        element.removeEventListener('mouseenter', handleEnter);
        element.removeEventListener('mouseleave', handleLeave);
      });
    };

    const bind = () => {
      interactiveElsRef.current = collectInteractiveElements();
      currentEls = interactiveElsRef.current;

      currentEls.forEach((element) => {
        element.addEventListener('mouseenter', handleEnter);
        element.addEventListener('mouseleave', handleLeave);
      });
    };

    bind();

    const observer = new MutationObserver(() => {
      if (hoverElRef.current && !hoverElRef.current.isConnected) {
        onHoverTargetRemoved();
      }

      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        unbind();
        bind();
      }, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(debounceTimer);
      observer.disconnect();
      unbind();
    };
  }, [hoverElRef, onEnter, onHoverTargetRemoved, onLeave]);

  return interactiveElsRef;
}
