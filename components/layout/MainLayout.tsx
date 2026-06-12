import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import styles from '../../styles/Home.module.scss';
import { useApp } from '../../contexts/AppContext';
import { useTransition } from '../../contexts/TransitionContext';
import { useResponsive } from '../../hooks/useMediaQuery';
import { defaultLocale, isLocale, type Locale } from '../../i18n/config';

import HomeLoadingScreen from '../shared/HomeLoadingScreen';
import MusicPlayer from '../interactive/MusicPlayer';
import GlobalHud from './GlobalHud';
import LeftPanel from './LeftPanel';


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

const commonLabelFallbacks: Record<Locale, Record<'openMenu' | 'closeMenu', string>> = {
  'zh-CN': {
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
  },
  'zh-TW': {
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
  },
  en: {
    openMenu: 'Open Menu',
    closeMenu: 'Close Menu',
  },
};

export default function MainLayout({ children }) {
  const router = useRouter();
  const tNav = useTranslations('mainNav');
  const tCommon = useTranslations('common');
  const { navigateTo, handleBack, isDetailOpen } = useTransition();
  const { isMobile, isDesktop } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const app = useApp();
  const {
    mainVisible, isInverted, isTesseractActivated, animationsComplete,
    chargeBattery, handleLoadingComplete,
    currentTime, hudVisible, leftPanelAnimated, leversVisible,
    handleActivateTesseract, handleDischargeLeverPull, isDischarging,
    powerLevel, isFateTypingActive, displayedFateText,
    isEnvParamsTyping, displayedEnvParams, envData, envDataVersion,
    deactivateTesseract,
  } = app;

  const isHome = router.pathname === '/[locale]';
  const isContentPage = router.pathname === '/[locale]/content';
  const isStandalone =
    router.pathname === '/[locale]/game' ||
    router.pathname.startsWith('/[locale]/game/') ||
    router.pathname.startsWith('/[locale]/web/') ||
    router.pathname.startsWith('/[locale]/life/') ||
    router.pathname.startsWith('/[locale]/blog/');

  // 当前 URL 的 locale，所有内部跳转都要带上前缀
  const queryLocale = router.query.locale;
  const locale = isLocale(queryLocale) ? queryLocale : defaultLocale;

  const prevStandaloneRef = useRef(isStandalone);
  const [localPanelAnimated, setLocalPanelAnimated] = useState(leftPanelAnimated);
  const [localLeversVisible, setLocalLeversVisible] = useState(leversVisible);
  // 桌面 Tesseract 拖拽态 —— 用于让电池在用户拖动物体时给出"被吸引"视觉反馈
  // 不放进 AppContext / PowerSystemState：纯 3D 场景的瞬态 UI 信号，不属于电力系统逻辑
  const [isTesseractDragging, setIsTesseractDragging] = useState(false);

  useEffect(() => {
    const wasStandalone = prevStandaloneRef.current;
    prevStandaloneRef.current = isStandalone;

    if (wasStandalone && !isStandalone) {
      // 从独立页返回 → 重置并重播面板和拉杆入场动画
      setLocalPanelAnimated(false);
      setLocalLeversVisible(false);
      const t1 = setTimeout(() => {
        setLocalPanelAnimated(true);
      }, 50);
      const t2 = setTimeout(() => {
        setLocalLeversVisible(true);
      }, 850);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else if (isStandalone) {
      // 进入独立页 → 快速收回面板
      setLocalPanelAnimated(false);
      setLocalLeversVisible(false);
    } else {
      // 正常流程（包括初始加载）→ 直接同步全局状态，不干扰
      setLocalPanelAnimated(leftPanelAnimated);
      setLocalLeversVisible(leversVisible);
    }
  }, [isStandalone, leftPanelAnimated, leversVisible]);

  const [forceHomeSection, setForceHomeSection] = useState(false);
  if (isHome && forceHomeSection) {
    setForceHomeSection(false);
  }
  const activeSection = (forceHomeSection || isHome) ? 'home' : 'content';

  // Latch: once WebGL is ready, never unmount it (avoids GPU context destruction during transitions)
  const [webglReady, setWebglReady] = useState(false);
  if (animationsComplete && !webglReady) {
    setWebglReady(true);
  }

  // 移动端：拉杆激活后直接充电（桌面端由 TesseractExperience 组件负责充电）
  const chargeBatteryRef = useRef(chargeBattery);
  const deactivateTesseractRef = useRef(deactivateTesseract);
  useEffect(() => {
    chargeBatteryRef.current = chargeBattery;
  }, [chargeBattery]);
  useEffect(() => {
    deactivateTesseractRef.current = deactivateTesseract;
  }, [deactivateTesseract]);

  useEffect(() => {
    if (!isDesktop && isTesseractActivated) {
      const interval = setInterval(() => {
        chargeBatteryRef.current();
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isDesktop, isTesseractActivated]);

  // Tesseract 取消激活时清零拖拽态，防止子组件未触发 pointer up 就被卸载留下脏值
  useEffect(() => {
    if (!isTesseractActivated && isTesseractDragging) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 子组件可能在 pointer up 前被卸载，必须在父层兜底
      setIsTesseractDragging(false);
    }
  }, [isTesseractActivated, isTesseractDragging]);

  // 移动端：充满 100% 自动放下充电拉杆
  useEffect(() => {
    if (!isDesktop && powerLevel >= 100 && isTesseractActivated) {
      deactivateTesseractRef.current();
    }
  }, [isDesktop, powerLevel, isTesseractActivated]);

  const handleGlobalBackClick = () => {
    if (!isDetailOpen()) {
      setForceHomeSection(true);
    }
    handleBack();
  };

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const navLinks = [
    { label: tNav('works'), hash: 'works' },
    { label: tNav('experience'), hash: 'experience' },
    { label: tNav('blog'), hash: 'blog' },
    { label: tNav('life'), hash: 'life' },
    { label: tNav('contact'), hash: 'contact' },
    { label: tNav('about'), hash: 'about' },
  ];
  const resolveCommonLabel = (key: 'openMenu' | 'closeMenu') => {
    const translated = tCommon(key);
    return translated === key ? commonLabelFallbacks[locale][key] : translated;
  };
  const drawerToggleLabel = drawerOpen ? resolveCommonLabel('closeMenu') : resolveCommonLabel('openMenu');

  const handleLeftNavLinkClick = (link: { label: string; hash: string }) => {
    closeDrawer();

    if (isContentPage) {
      if (isDetailOpen()) {
        handleBack();
        setTimeout(() => {
          const el = document.getElementById(`section-${link.hash}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 1900);
      } else {
        const el = document.getElementById(`section-${link.hash}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else {
      navigateTo(`/${locale}/content#${link.hash}`);
    }
  };

  const handleFriendsClick = useCallback(() => {
    closeDrawer();
    navigateTo(`/${locale}/friends`);
  }, [navigateTo, closeDrawer, locale]);

  return (
    <div className={`${styles.container} ${isInverted ? styles.inverted : ''}`}>


      <div className={styles.leftDotMatrix}></div>
      {mainVisible && <MusicPlayer powerLevel={powerLevel} />}
      {isDesktop && <CustomCursor />}
      {webglReady && isDesktop && <RainMorimeEffect />}
      <HomeLoadingScreen onComplete={handleLoadingComplete} />
      {isTesseractActivated && isDesktop && !isStandalone && (
        <TesseractExperience
          chargeBattery={chargeBattery}
          isActivated={isTesseractActivated}
          isInverted={isInverted}
          onDraggingChange={setIsTesseractDragging}
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
          <GlobalHud currentTime={currentTime} hudVisible={hudVisible || isStandalone} isGamePage={router.pathname === '/[locale]/game'} />
          <LeftPanel
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
            handleFriendsClick={handleFriendsClick}
            powerLevel={powerLevel}
            isFateTypingActive={isFateTypingActive}
            displayedFateText={displayedFateText}
            isEnvParamsTyping={isEnvParamsTyping}
            displayedEnvParams={displayedEnvParams}
            isInverted={isInverted}
            drawerOpen={drawerOpen}
            isStandalone={isStandalone}
            isTesseractDragging={isTesseractDragging}
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
