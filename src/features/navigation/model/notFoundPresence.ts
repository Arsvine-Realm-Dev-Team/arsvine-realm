'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const activeViews = new Set<symbol>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeViews.size > 0;
}

function getServerSnapshot() {
  return false;
}

export function useNotFoundPresence() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useRegisterNotFoundPresence() {
  useLayoutEffect(() => {
    const view = Symbol('not-found-view');
    activeViews.add(view);
    emitChange();

    return () => {
      activeViews.delete(view);
      emitChange();
    };
  }, []);
}
