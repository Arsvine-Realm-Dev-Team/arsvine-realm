import { startTransition, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import styles from '../../styles/Home.module.scss';
import { useApp } from '../../contexts/AppContext';
import LayoutAnchorsContext from '../../contexts/LayoutAnchorsContext';
import { useTransition } from '../../contexts/TransitionContext';
import { useResponsive } from '../../hooks/useMediaQuery';
import useDrawerNavigation from '../../hooks/useDrawerNavigation';
import useLayoutRouteMode from '../../hooks/useLayoutRouteMode';
import useMobileTesseractCharge from '../../hooks/useMobileTesseractCharge';
import useRouteLoadingKind from '../../hooks/useRouteLoadingKind';
import useStandalonePanelState from '../../hooks/useStandalonePanelState';
import { setHudTypingOverlaySuppressed, setHudTypingRouteEnabled } from '../../lib/hud-typing-visibility';
import { CONTENT_DETAIL_EXIT_DELAY_MS } from '../../lib/ui-timings';
import {
  clearPendingContentHashNavigation,
  CONTENT_HASH_SCROLL_EVENT,
  CONTENT_HASH_SCROLL_COMPLETE_EVENT,
  type ContentHashNavigationRequest,
  hasPendingContentHashNavigation,
} from '../../lib/content-hash-navigation';
import { resolveLocale, type Locale } from '../../i18n/config';

import HomeLoadingScreen from '../shared/HomeLoadingScreen';
import MusicPlayer from '../interactive/MusicPlayer';
import GlobalHud from './GlobalHud';
import LeftPanel from './LeftPanel';
import RouteLoadingOverlay from './RouteLoadingOverlay';


const TesseractExperience = dynamic(
  () => import('../effects/TesseractExperience').catch(() => ({
    default: () => null,
  })),
  { ssr: false, loading: () => null }
);

const RainMorimeEffect = dynamic(
  () => import('../effects/RainMorimeEffect').catch(() => ({
    default: () => null,
  })),
  { ssr: false, loading: () => null }
);

const CustomCursor = dynamic(
  () => import('../interactive/CustomCursor').catch(() => ({
    default: () => null,
  })),
  { ssr: false, loading: () => null }
);

interface MainLayoutProps {
  children: ReactNode;
  appLocale?: Locale;
}

export default function MainLayout({ children, appLocale }: MainLayoutProps) {
  const router = useRouter();
  const tNav = useTranslations('mainNav');
  const tCommon = useTranslations('common');
  const tTweets = useTranslations('pages.tweets');
  const { navigateTo, handleBack, isDetailOpen } = useTransition();
  const { isMobile, isDesktop } = useResponsive();
  const app = useApp();
  const {
    mainVisible, isInverted, isTesseractActivated, animationsComplete,
    chargeBattery, handleLoadingComplete,
    currentTime, hudVisible, leftPanelAnimated, leversVisible,
    handleActivateTesseract, handleDischargeLeverPull, isDischarging,
    powerLevel, isFateTypingActive, displayedFateText,
    isEnvParamsTyping, displayedEnvParams, envData, envArtifactStage,
    deactivateTesseract,
    allowAmbientWebGL, allowInteractiveWebGL, allowCustomCursor,
  } = app;

  // 当前 URL 的 locale，所有内部跳转都要带上前缀
  const locale: Locale = appLocale ?? resolveLocale(router.query.locale, router.asPath);

  const {
    drawerOpen,
    navLinks,
    drawerToggleLabel,
    toggleDrawer,
    closeDrawer,
  } = useDrawerNavigation({
    locale,
    tNav,
    tCommon,
  });

  const [forceHomeSection, setForceHomeSection] = useState(false);
  const { isHome, isContentPage, isStandalone, activeSection } = useLayoutRouteMode(
    router,
    forceHomeSection,
  );
  const { localPanelAnimated, localLeversVisible } = useStandalonePanelState({
    isStandalone,
    leftPanelAnimated,
    leversVisible,
  });
  const routeLoadingState = useRouteLoadingKind(router);
  // 桌面 Tesseract 拖拽态 —— 用于让电池在用户拖动物体时给出"被吸引"视觉反馈
  // 不放进 AppContext / PowerSystemState：纯 3D 场景的瞬态 UI 信号，不属于电力系统逻辑
  const [isTesseractDragging, setIsTesseractDragging] = useState(false);
  const powerDisplayRef = useRef<HTMLDivElement | null>(null);
  const batteryIconRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingContentHashCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isHome && forceHomeSection) {
      const timeoutId = window.setTimeout(() => {
        setForceHomeSection(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [forceHomeSection, isHome]);

  const allow3DTesseract = allowInteractiveWebGL && isDesktop;

  // Latch: once WebGL is ready, never unmount it (avoids GPU context destruction during transitions)
  const [webglReady, setWebglReady] = useState(false);
  useEffect(() => {
    if (animationsComplete && !webglReady) {
      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setWebglReady(true);
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [animationsComplete, webglReady]);

  useMobileTesseractCharge({
    shouldUseAutoChargeFallback: !allow3DTesseract,
    isTesseractActivated,
    powerLevel,
    chargeBattery,
    deactivateTesseract,
  });

  // Tesseract 取消激活时清零拖拽态，防止子组件未触发 pointer up 就被卸载留下脏值
  useEffect(() => {
    if (!isTesseractActivated && isTesseractDragging) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 子组件可能在 pointer up 前被卸载，必须在父层兜底
      setIsTesseractDragging(false);
    }
  }, [isTesseractActivated, isTesseractDragging]);

  const handleGlobalBackClick = () => {
    if (!isDetailOpen()) {
      setForceHomeSection(true);
    }
    handleBack();
  };

  const registerScrollContainer = useCallback((element: HTMLDivElement | null) => {
    scrollContainerRef.current = element;
  }, []);

  const scheduleContentHashScroll = useCallback((request: string | ContentHashNavigationRequest) => {
    const target = typeof request === 'string'
      ? { hash: request, requestId: null }
      : request;
    let frameId = 0;
    let timeoutId = 0;
    let attempts = 0;
    let cancelled = false;
    let completed = false;

    const getTargetOffset = () => {
      if (!isMobile) {
        return 0;
      }

      const rawOffset = getComputedStyle(document.documentElement)
        .getPropertyValue('--mobile-section-scroll-offset')
        .trim()
        .replace('px', '');
      const parsed = Number.parseFloat(rawOffset);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const finish = () => {
      if (cancelled || completed) {
        return;
      }

      completed = true;
      if (target.requestId) {
        window.dispatchEvent(new CustomEvent(CONTENT_HASH_SCROLL_COMPLETE_EVENT, {
          detail: target,
        }));
        clearPendingContentHashNavigation();
      }
    };

    const align = () => {
      if (cancelled) {
        return;
      }

      const element = document.getElementById(`section-${target.hash}`);
      const scrollContainer = scrollContainerRef.current;
      const maxAttempts = 6;

      if (!element || !scrollContainer) {
        if (attempts < maxAttempts) {
          attempts += 1;
          timeoutId = window.setTimeout(() => {
            frameId = window.requestAnimationFrame(align);
          }, 50);
        } else {
          finish();
        }
        return;
      }

      element.scrollIntoView({ behavior: 'auto', block: 'start' });
      attempts += 1;

      const top = element.getBoundingClientRect().top;
      const expectedTop = getTargetOffset();
      if (attempts < maxAttempts && Math.abs(top - expectedTop) > 8) {
        timeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(align);
        }, 50);
        return;
      }

      finish();
    };

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(align);
    });

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isMobile]);

  const updateContentHashAndScroll = useCallback((link: {
    label: string;
    href: string;
    group: 'content' | 'standalone';
    hash?: string;
  }) => {
    if (!link.hash) {
      return;
    }

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(link.href, window.location.origin);
      const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextHref !== currentHref) {
        window.history.pushState(window.history.state, '', nextHref);
      }
    }

    const el = document.getElementById(`section-${link.hash}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleLeftNavLinkClick = (link: { label: string; href: string; group: 'content' | 'standalone'; hash?: string }) => {
    closeDrawer();

    if (link.hash && isContentPage) {
      if (isDetailOpen()) {
        handleBack();
        window.setTimeout(() => {
          updateContentHashAndScroll(link);
        }, CONTENT_DETAIL_EXIT_DELAY_MS);
      } else {
        updateContentHashAndScroll(link);
      }
      return;
    }

    navigateTo(link.href);
  };

  const routeLoadingText = routeLoadingState.kind === 'tweets'
    ? tTweets('loading')
    : tCommon('decoding');

  useEffect(() => {
    setHudTypingRouteEnabled(!isStandalone);
    if (isStandalone) {
      setHudTypingOverlaySuppressed(false);
    }
  }, [isStandalone]);

  useEffect(() => {
    window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'));
  }, [router.asPath]);

  useEffect(() => {
    if (mainVisible) {
      window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'));
    }
  }, [mainVisible]);

  useEffect(() => {
    const handleScrollEvent = (event: Event) => {
      const request = (event as CustomEvent<ContentHashNavigationRequest>).detail;
      if (!request?.hash) {
        return;
      }

      pendingContentHashCleanupRef.current?.();
      pendingContentHashCleanupRef.current = scheduleContentHashScroll(request);
    };

    window.addEventListener(CONTENT_HASH_SCROLL_EVENT, handleScrollEvent as EventListener);
    return () => {
      pendingContentHashCleanupRef.current?.();
      pendingContentHashCleanupRef.current = null;
      window.removeEventListener(CONTENT_HASH_SCROLL_EVENT, handleScrollEvent as EventListener);
    };
  }, [scheduleContentHashScroll]);

  useEffect(() => {
    if (router.pathname !== '/[locale]/content') {
      return;
    }

    const hash = router.asPath.split('#')[1];
    if (!hash || hasPendingContentHashNavigation(hash)) {
      return;
    }

    return scheduleContentHashScroll(hash);
  }, [router.asPath, router.pathname, scheduleContentHashScroll]);

  return (
    <LayoutAnchorsContext.Provider
      value={{
        registerScrollContainer,
        getScrollContainer: () => scrollContainerRef.current,
      }}
    >
      <div className={`${styles.container} ${isInverted ? styles.inverted : ''}`}>


        <div className={styles.leftDotMatrix}></div>
        {mainVisible && <MusicPlayer powerLevel={powerLevel} />}
        {isDesktop && allowCustomCursor && <CustomCursor />}
        {webglReady && isDesktop && allowAmbientWebGL && <RainMorimeEffect />}
        <HomeLoadingScreen onComplete={handleLoadingComplete} />
        {isTesseractActivated && allow3DTesseract && !isStandalone && (
          <TesseractExperience
            chargeBattery={chargeBattery}
            isActivated={isTesseractActivated}
            isInverted={isInverted}
            onDraggingChange={setIsTesseractDragging}
            powerDisplayRef={powerDisplayRef}
            batteryIconRef={batteryIconRef}
            scrollContainerRef={scrollContainerRef}
          />
        )}
        <div className={styles.gridBackground}></div>
        <div className={styles.glowEffect}></div>
        <div className={styles.rightStripeGradient}></div>

      {/* 汉堡菜单按钮 (仅平板端，移动端由底部功能栏替代) */}
        {mainVisible && (
          <button
            className={`${styles.hamburgerButton} ${drawerOpen ? styles.hamburgerOpen : ''}`}
            onClick={toggleDrawer}
            aria-label={drawerToggleLabel}
            data-cursor-label={drawerToggleLabel}
          >
            <span />
            <span />
            <span />
          </button>
        )}

      {/* 抽屉背景遮罩 */}
        <div
          className={`${styles.drawerBackdrop} ${drawerOpen ? styles.backdropVisible : ''}`}
          onClick={closeDrawer}
        />

        {mainVisible && (
          <>
            <GlobalHud
              currentTime={currentTime}
              hudVisible={hudVisible || isStandalone}
              isGamePage={router.pathname === '/[locale]/game'}
              locale={locale}
            />
            <LeftPanel
              locale={locale}
              leftPanelAnimated={localPanelAnimated}
              mainVisible={mainVisible}
              leversVisible={localLeversVisible}
              handleActivateTesseract={handleActivateTesseract}
              isTesseractActivated={isTesseractActivated}
              handleDischargeLeverPull={handleDischargeLeverPull}
              isDischarging={isDischarging}
              activeSection={activeSection}
              handleGlobalBackClick={handleGlobalBackClick}
              navLinks={navLinks}
              handleLeftNavLinkClick={handleLeftNavLinkClick}
              powerLevel={powerLevel}
              isFateTypingActive={isFateTypingActive}
              displayedFateText={displayedFateText}
              isEnvParamsTyping={isEnvParamsTyping}
              displayedEnvParams={displayedEnvParams}
              envData={envData}
              envArtifactStage={envArtifactStage}
              isInverted={isInverted}
               drawerOpen={drawerOpen}
               isStandalone={isStandalone}
               isTesseractDragging={isTesseractDragging}
               powerDisplayRef={powerDisplayRef}
               batteryIconRef={batteryIconRef}
             />
           </>
         )}
        <div style={{
          opacity: mainVisible ? 1 : 0,
          pointerEvents: mainVisible ? 'auto' : 'none',
          transition: 'opacity 0.4s ease-out',
        }}>
          {children}
        </div>

        {mainVisible && routeLoadingState.kind ? (
          <RouteLoadingOverlay
            presentation={routeLoadingState.presentation}
            routeLoadingText={routeLoadingText}
            signalLabel={tCommon('signalFragment')}
          />
        ) : null}

      {/* 底部功能栏 (移动端) */}
        {mainVisible && isMobile && (
          <nav className={styles.bottomBar}>
            <button
              className={`${styles.bottomBarBtn} ${isHome ? styles.bottomBarDisabled : ''}`}
              onClick={() => { if (!isHome) handleGlobalBackClick(); }}
            >
              <span className={styles.bottomBarIcon}>◁</span>
              <span className={styles.bottomBarIndicator} />
            </button>
            <button
              className={`${styles.bottomBarBtn} ${isHome ? styles.bottomBarCurrent : ''}`}
              onClick={() => { if (!isHome) navigateTo(`/${locale}`); }}
            >
              <span className={styles.bottomBarIcon}>⬡</span>
              <span className={styles.bottomBarIndicator} />
            </button>
            <button
              className={`${styles.bottomBarBtn} ${drawerOpen ? styles.bottomBarActive : ''}`}
              onClick={toggleDrawer}
              aria-label={drawerToggleLabel}
            >
              <span className={styles.bottomBarIcon}>{drawerOpen ? '✕' : '☰'}</span>
              <span className={styles.bottomBarIndicator} />
            </button>
          </nav>
        )}
      </div>
    </LayoutAnchorsContext.Provider>
  );
}
