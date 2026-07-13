import type { ReactNode, RefObject } from 'react';

import { HudProvider } from '../../features/hud/model/HudProvider';
import { SiteAssetsProvider } from '../../features/assets/model/SiteAssetsProvider';
import { TransitionProvider } from '../../features/navigation/model/TransitionProvider';

interface AppProvidersProps {
  children: ReactNode;
  pageWrapperRef: RefObject<HTMLDivElement | null>;
}

export default function AppProviders({ children, pageWrapperRef }: AppProvidersProps) {
  return (
    <SiteAssetsProvider>
      <HudProvider>
        <TransitionProvider pageWrapperRef={pageWrapperRef}>
          {children}
        </TransitionProvider>
      </HudProvider>
    </SiteAssetsProvider>
  );
}
