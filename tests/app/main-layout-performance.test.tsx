import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const useResponsiveMock = vi.fn();
const recordMobileTesseractChargeCall = vi.fn();

vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/[locale]/content',
    asPath: '/zh-CN/content',
    query: { locale: 'zh-CN' },
    push: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/dynamic', () => {
  let callCount = 0;
  return {
    default: () => {
      callCount += 1;
      const testIds = ['tesseract-experience', 'rain-effect', 'custom-cursor'];
      const testId = testIds[callCount - 1] ?? 'dynamic-stub';
      return function DynamicStub() {
        return <div data-testid={testId} />;
      };
    },
  };
});

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHud: () => useAppMock(),
}));

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({
    navigateTo: vi.fn(),
    handleBack: vi.fn(),
    isDetailOpen: () => false,
  }),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => useResponsiveMock(),
}));

vi.mock('@/features/navigation/model/useDrawerNavigation', () => ({
  default: () => ({
    drawerOpen: false,
    navLinks: [],
    drawerToggleLabel: 'drawer',
    toggleDrawer: vi.fn(),
    closeDrawer: vi.fn(),
  }),
}));

vi.mock('@/features/navigation/model/useLayoutRouteMode', () => ({
  default: () => ({
    isHome: false,
    isContentPage: true,
    isStandalone: false,
    activeSection: 'content',
  }),
}));

vi.mock('@/features/navigation/model/useStandalonePanelState', () => ({
  default: () => ({
    localPanelAnimated: true,
    localLeversVisible: true,
  }),
}));

vi.mock('@/features/navigation/model/useRouteLoadingKind', () => ({
  default: () => ({
    kind: null,
    presentation: 'default',
  }),
}));

vi.mock('@/features/hud/model/useMobileTesseractCharge', () => ({
  default: (options: unknown) => recordMobileTesseractChargeCall(options),
}));

vi.mock('@/features/hud/ui/loading/HomeLoadingScreen', () => ({
  default: () => <div data-testid="home-loading-screen" />,
}));

vi.mock('@/features/music/public', () => ({
  default: () => <div data-testid="music-player" />,
}));

vi.mock('@/features/hud/ui/layout/GlobalHud', () => ({
  default: () => <div data-testid="global-hud" />,
}));

vi.mock('@/features/hud/ui/layout/LeftPanel', () => ({
  default: () => <div data-testid="left-panel" />,
}));

vi.mock('@/features/hud/ui/layout/RouteLoadingOverlay', () => ({
  default: () => <div data-testid="route-loading-overlay" />,
}));

import MainLayout from '@/app/shell/MainLayout';

function buildAppState(overrides: Record<string, unknown> = {}) {
  return {
    mainVisible: true,
    isInverted: false,
    isTesseractActivated: true,
    animationsComplete: true,
    chargeBattery: vi.fn(),
    handleLoadingComplete: vi.fn(),
    currentTime: '00:00:00',
    hudVisible: true,
    leftPanelAnimated: true,
    leversVisible: true,
    handleActivateTesseract: vi.fn(),
    handleDischargeLeverPull: vi.fn(),
    isDischarging: false,
    powerLevel: 64,
    isFateTypingActive: false,
    displayedFateText: '',
    isEnvParamsTyping: false,
    displayedEnvParams: '',
    envData: null,
    envArtifactStage: 0,
    deactivateTesseract: vi.fn(),
    allowAmbientWebGL: true,
    allowInteractiveWebGL: true,
    allowCustomCursor: true,
    ...overrides,
  };
}

describe('MainLayout adaptive performance gates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useResponsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isDesktop: true });
    useAppMock.mockReturnValue(buildAppState());
    recordMobileTesseractChargeCall.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips optional desktop effects and enables fallback charging in reduced mode', () => {
    useAppMock.mockReturnValue(buildAppState({
      allowAmbientWebGL: false,
      allowInteractiveWebGL: false,
      allowCustomCursor: false,
    }));

    render(
      <MainLayout appLocale="zh-CN">
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.queryByTestId('custom-cursor')).toBeNull();
    expect(screen.queryByTestId('rain-effect')).toBeNull();
    expect(screen.queryByTestId('tesseract-experience')).toBeNull();
    expect(recordMobileTesseractChargeCall).toHaveBeenCalledWith(expect.objectContaining({
      shouldUseAutoChargeFallback: true,
      isTesseractActivated: true,
    }));
  });

  it('renders optional desktop effects when full mode allows them', () => {
    render(
      <MainLayout appLocale="zh-CN">
        <div>child</div>
      </MainLayout>,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('custom-cursor')).toBeTruthy();
    expect(screen.getByTestId('rain-effect')).toBeTruthy();
    expect(screen.getByTestId('tesseract-experience')).toBeTruthy();
    expect(recordMobileTesseractChargeCall).toHaveBeenCalledWith(expect.objectContaining({
      shouldUseAutoChargeFallback: false,
    }));
  });
});
