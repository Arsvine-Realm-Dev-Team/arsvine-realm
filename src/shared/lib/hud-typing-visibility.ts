type Listener = () => void;

interface HudTypingVisibilityState {
  routeEnabled: boolean;
  overlaySuppressed: boolean;
}

const listeners = new Set<Listener>();

let state: HudTypingVisibilityState = {
  routeEnabled: true,
  overlaySuppressed: false,
};

function emitIfChanged(nextState: HudTypingVisibilityState) {
  if (
    nextState.routeEnabled === state.routeEnabled &&
    nextState.overlaySuppressed === state.overlaySuppressed
  ) {
    return;
  }

  state = nextState;
  listeners.forEach((listener) => listener());
}

export function subscribeHudTypingVisibility(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHudTypingEnabledSnapshot() {
  return state.routeEnabled && !state.overlaySuppressed;
}

export function setHudTypingRouteEnabled(routeEnabled: boolean) {
  emitIfChanged({
    ...state,
    routeEnabled,
  });
}

export function setHudTypingOverlaySuppressed(overlaySuppressed: boolean) {
  emitIfChanged({
    ...state,
    overlaySuppressed,
  });
}
