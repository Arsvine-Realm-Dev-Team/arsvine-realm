import { createContext, useContext } from 'react';

interface LayoutAnchorsContextValue {
  registerScrollContainer: (element: HTMLDivElement | null) => void;
  getScrollContainer: () => HTMLDivElement | null;
}

const noop = () => {};

const LayoutAnchorsContext = createContext<LayoutAnchorsContextValue>({
  registerScrollContainer: noop,
  getScrollContainer: () => null,
});

export function useLayoutAnchors() {
  return useContext(LayoutAnchorsContext);
}

export default LayoutAnchorsContext;
