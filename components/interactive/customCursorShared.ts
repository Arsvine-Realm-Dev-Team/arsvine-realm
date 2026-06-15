export const MAGNETIC_DISTANCE = 120;
export const MAGNETIC_STRENGTH = 0.4;
export const CURSOR_INTERACTIVE_SELECTOR = 'a, button, .btn, [role="button"], [data-cursor-magnetic]';

export interface CursorTargetBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function isCursorInteractive(el: HTMLElement | null) {
  if (!el || !el.isConnected) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  let current: HTMLElement | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity || '1') === 0
    ) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

export function getInteractiveCursorTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  const candidate = target.closest(CURSOR_INTERACTIVE_SELECTOR) as HTMLElement | null;
  if (!candidate) return null;
  if (candidate.closest('[data-cursor-no-magnetic]') && !candidate.hasAttribute('data-cursor-magnetic')) {
    return null;
  }

  return isCursorInteractive(candidate) ? candidate : null;
}

export function collectInteractiveElements() {
  return Array.from(document.querySelectorAll(CURSOR_INTERACTIVE_SELECTOR)).filter((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.closest('[data-cursor-no-magnetic]') && !htmlEl.hasAttribute('data-cursor-magnetic')) {
      return false;
    }
    return true;
  }) as HTMLElement[];
}

export function getCursorTargetBounds(el: HTMLElement, padding = 0): CursorTargetBounds {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    w: rect.width + padding,
    h: rect.height + padding,
  };
}

export function resolveCursorLabel(el: HTMLElement) {
  return el.getAttribute('data-cursor-label') || el.getAttribute('aria-label') || '';
}

export function findClosestInteractiveElement(
  elements: HTMLElement[],
  pointerX: number,
  pointerY: number,
) {
  let closestElement: HTMLElement | null = null;
  let closestDistance = Infinity;

  elements.forEach((el) => {
    if (!isCursorInteractive(el)) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(pointerX - centerX, pointerY - centerY);

    if (distance < MAGNETIC_DISTANCE && distance < closestDistance) {
      closestDistance = distance;
      closestElement = el;
    }
  });

  if (!closestElement) {
    return null;
  }

  return {
    element: closestElement,
    distance: closestDistance,
    rect: closestElement.getBoundingClientRect(),
  };
}
