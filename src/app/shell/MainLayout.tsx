import { useState, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import styles from '../styles/Shell.module.scss';
import {
  useHudAnimation,
  useHudPerformance,
  useHudPower,
  useHudStats,
  useHudTyping,
} from '../../features/hud/model/HudProvider';
import { useLayoutAnchors } from '../../features/navigation/model/LayoutAnchorsContext';
import { useTransition } from '../../features/navigation/model/TransitionProvider';
import { useResponsive } from '@/shared/hooks/useMediaQuery';
import useDrawerNavigation from '../../features/navigation/model/useDrawerNavigation';
import useLayoutRouteMode from '../../features/navigation/model/useLayoutRouteMode';
import useMobileTesseractCharge from '@/features/hud/model/useMobileTesseractCharge';
import useRouteLoadingKind from '../../features/navigation/model/useRouteLoadingKind';
import useStandalonePanelState from '../../features/navigation/model/useStandalonePanelState';
import { resolveLocale, type Locale } from '@/app/i18n/config';
import {
  useContentHashAlignment,
  useCursorTargetInvalidation,
  useHudRouteVisibility,
  useWebglReadyLatch,
} from './useMainLayoutEffects';
import { useLeftPanelNavigation, useTesseractDragFeedback } from './useMainLayoutNavigation';

import HomeLoadingScreen from '../../features/hud/ui/loading/HomeLoadingScreen';
import MusicPlayer from '../../features/music/public';
import GlobalHud from '../../features/hud/ui/layout/GlobalHud';
import LeftPanel from '../../features/hud/ui/layout/LeftPanel';
import RouteLoadingOverlay from '../../features/hud/ui/layout/RouteLoadingOverlay';


const TesseractExperience = dynamic(
  () => import('../../features/hud/ui/effects/TesseractExperience').catch(() => ({
    default: () => null,
  })),
  { ssr: false, loading: () => null }
);

const RainMorimeEffect = dynamic(
  () => import('../../features/hud/ui/effects/RainMorimeEffect').catch(() => ({
    default: () => null,
  })),
  { ssr: false, loading: () => null }
);

const CustomCursor = dynamic(
  () => import('../../features/hud/ui/cursor/CustomCursor').catch(() => ({
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
  const { getScrollContainer } = useLayoutAnchors();
  const { isMobile, isDesktop } = useResponsive();
  const {
    mainVisible, animationsComplete, handleLoadingComplete,
    hudVisible, leftPanelAnimated, leversVisible,
  } = useHudAnimation();
  const {
    isInverted, isTesseractActivated, chargeBattery,
    handleActivateTesseract, handleDischargeLeverPull, isDischarging,
    powerLevel, deactivateTesseract,
  } = useHudPower();
  const { currentTime } = useHudStats();
  const {
    isFateTypingActive, displayedFateText,
    isEnvParamsTyping, displayedEnvParams, envData, envArtifactStage,
  } = useHudTyping();
  const {
    allowAmbientWebGL, allowInteractiveWebGL, allowCustomCursor,
  } = useHudPerformance();

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
  // 不放进 HudContext / PowerSystemState：纯 3D 场景的瞬态 UI 信号，不属于电力系统逻辑
  const {
    displayedDragging: displayedTesseractDragging,
    onDraggingChange: setIsTesseractDragging,
  } = useTesseractDragFeedback(isTesseractActivated);
  const powerDisplayRef = useRef<HTMLDivElement | null>(null);
  const batteryIconRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useMemo<RefObject<HTMLDivElement | null>>(() => ({
    get current() {
      return getScrollContainer();
    },
  }), [getScrollContainer]);

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
  const webglReady = useWebglReadyLatch(animationsComplete);

  useMobileTesseractCharge({
    shouldUseAutoChargeFallback: !allow3DTesseract,
    isTesseractActivated,
    powerLevel,
    chargeBattery,
    deactivateTesseract,
  });

  const handleGlobalBackClick = () => {
    if (!isDetailOpen()) {
      setForceHomeSection(true);
    }
    handleBack();
  };

  const handleLeftNavLinkClick = useLeftPanelNavigation({
    closeDrawer,
    isContentPage,
    isDetailOpen,
    handleBack,
    navigateTo,
  });

  const routeLoadingText = routeLoadingState.kind === 'tweets'
    ? tTweets('loading')
    : tCommon('decoding');

  useHudRouteVisibility(isStandalone);
  useCursorTargetInvalidation(router.asPath, mainVisible);
  useContentHashAlignment(router.pathname, router.asPath);

  return (
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
              isGamePage={false}
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
               isTesseractDragging={displayedTesseractDragging}
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
  );
}
