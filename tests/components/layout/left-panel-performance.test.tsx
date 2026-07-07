import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const useResponsiveMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../contexts/AppContext', () => ({
  useApp: () => useAppMock(),
}));

vi.mock('../../../hooks/useMediaQuery', () => ({
  useResponsive: () => useResponsiveMock(),
}));

vi.mock('../../../components/interactive/ActivationLever', () => ({
  default: () => <div data-testid="activation-lever" />,
}));

import LeftPanel from '../../../components/layout/LeftPanel';

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'zh-CN',
    leftPanelAnimated: true,
    mainVisible: true,
    leversVisible: true,
    handleActivateTesseract: vi.fn(),
    isTesseractActivated: false,
    handleDischargeLeverPull: vi.fn(),
    isDischarging: false,
    activeSection: 'content',
    handleGlobalBackClick: vi.fn(),
    navLinks: [],
    handleLeftNavLinkClick: vi.fn(),
    powerLevel: 67,
    isFateTypingActive: false,
    displayedFateText: '',
    isEnvParamsTyping: false,
    displayedEnvParams: '',
    envArtifactStage: 0,
    isInverted: false,
    drawerOpen: false,
    isStandalone: false,
    isTesseractDragging: false,
    powerDisplayRef: { current: null },
    batteryIconRef: { current: null },
    envData: null,
    ...overrides,
  } as const;
}

describe('LeftPanel adaptive performance', () => {
  beforeEach(() => {
    useResponsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isDesktop: true });
    useAppMock.mockReturnValue({ allowDecorativeMotion: true, performanceTier: 'full' });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('attaches the logo motion listener in full mode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<LeftPanel {...buildProps()} />);

    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
  });

  it('skips logo color dispersion in reduced mode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    useAppMock.mockReturnValue({ allowDecorativeMotion: false, performanceTier: 'reduced' });

    const { container } = render(<LeftPanel {...buildProps()} />);

    expect(addSpy).not.toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
    expect(container.querySelector('[class*="logoContainer"]')).toBeNull();
  });
});
