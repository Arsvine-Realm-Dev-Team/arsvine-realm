const CURSOR_TARGETS_DIRTY_EVENT = 'arsvine:cursor-targets-dirty';

export function markCursorTargetsDirty() {
  window.dispatchEvent(new Event(CURSOR_TARGETS_DIRTY_EVENT));
}

export function subscribeCursorTargetsDirty(listener: () => void) {
  window.addEventListener(CURSOR_TARGETS_DIRTY_EVENT, listener);
  return () => window.removeEventListener(CURSOR_TARGETS_DIRTY_EVENT, listener);
}
