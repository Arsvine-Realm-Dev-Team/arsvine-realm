import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const useResponsiveMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHud: () => useAppMock(),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => useResponsiveMock(),
}));

vi.mock('@/features/hud/ui/ActivationLever', () => ({
  default: () => <div data-testid="activation-lever" />,
}));

import LeftPanel from '@/features/hud/ui/layout/LeftPanel';

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
    useAppMock.mockReturnValue({ allowLogoMotion: true, performanceTier: 'full' });
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
    useAppMock.mockReturnValue({ allowLogoMotion: false, performanceTier: 'reduced' });

    const { container } = render(<LeftPanel {...buildProps()} />);

    expect(addSpy).not.toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
    expect(container.querySelector('[class*="logoContainer"]')).not.toBeNull();
  });

  it('keeps one accessible Travelling link with desktop and compact mobile content', () => {
    const { container } = render(<LeftPanel {...buildProps()} />);
    const links = container.querySelectorAll('a[href^="https://www.travellings.cn/arsvine"]');

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('aria-label')).toBe('travellingLabel');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[0].querySelector('img')?.getAttribute('alt')).toBe('');
    expect(links[0].querySelector('[class*="travellingMobileBadge"]')?.textContent).toBe('travellingLabel');
    expect(links[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
