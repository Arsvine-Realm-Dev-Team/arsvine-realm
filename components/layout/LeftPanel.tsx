/* eslint-disable @next/next/no-img-element -- decorative SVG badge is local, non-critical, and sized by existing HUD CSS */
import { useEffect, useRef, type Ref } from 'react';
import styles from '../../styles/Home.module.scss';
import ActivationLever from '../interactive/ActivationLever';
import { useResponsive } from '../../hooks/useMediaQuery';
import type { EnvData } from '../../types';

// --- 渐变装饰条颜色映射 ---
// 6 段色块：1 段绿色 highlight + 5 段灰阶；flex 比例由模拟环境数据驱动。
// 数据维度对照：[overall→绿, temp→灰1, rad→灰2, o2→灰3, pollution→灰4, acidRain→灰5]
const POLL_SCORES: Record<string, number> = {
  SEVERE: 0.5,
  CRITICAL: 0.7,
  UNSTABLE: 0.6,
  HAZARDOUS: 0.9,
};
const RAIN_SCORES: Record<string, number> = {
  UNLIKELY: 0.1,
  LIKELY: 0.5,
  IMMINENT: 0.8,
  CERTAIN: 1.0,
};
const GRAY_BASE = [36, 24, 19, 12, 5];
const GRAY_COLORS = ['#333333', '#444444', '#666666', '#888888', '#aaaaaa'];

function computeBlocks(envData: EnvData | null) {
  if (!envData) {
    return [
      { flex: 4, color: 'var(--ark-highlight-green)' },
      ...GRAY_BASE.map((f, i) => ({ flex: f, color: GRAY_COLORS[i] })),
    ];
  }

  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const scores = [
    cl((envData.temp - 44) / 22),
    cl((envData.rad - 200) / 300),
    cl(1 - (envData.o2 - 8) / 2),
    POLL_SCORES[envData.pollution] ?? 0.5,
    RAIN_SCORES[envData.acidRain] ?? 0.3,
  ];

  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

  const grays = GRAY_BASE.map((base, i) => ({
    flex: Math.max(2, base + (scores[i] - 0.5) * 16),
    color: GRAY_COLORS[i],
  }));

  return [
    { flex: Math.max(1.5, 4 + (overall - 0.5) * 3), color: 'var(--ark-highlight-green)' },
    ...grays,
  ];
}

export default function LeftPanel({
  leftPanelAnimated,
  mainVisible,
  leversVisible,
  handleActivateTesseract,
  isTesseractActivated,
  handleDischargeLeverPull,
  isDischarging,
  activeSection,
  handleGlobalBackClick,
  navLinks,
  handleLeftNavLinkClick,
  handleFriendsClick,
  handleTweetsClick,
  tweetsLabel,
  powerLevel,
  isFateTypingActive,
  displayedFateText,
  isEnvParamsTyping,
  displayedEnvParams,
  isInverted,
  drawerOpen = false,
  isStandalone = false,
  isTesseractDragging = false,
  powerDisplayRef,
  batteryIconRef,
  envData = null as EnvData | null,
}) {
  const chargeLeverLabel = isTesseractActivated ? 'CHARGING' : 'START CHARGE';
  const dischargeLeverLabel = isDischarging
    ? 'DISCHARGING'
    : powerLevel === 100
      ? 'DISCHARGE'
      : 'FULL CHARGE REQUIRED';

  const showBackAndNav =
    leftPanelAnimated && (
      activeSection === 'content' ||
      activeSection === 'lifeDetail' ||
      activeSection === 'workDetail' ||
      activeSection === 'experienceDetail' ||
      activeSection === 'blog' ||
      activeSection === 'blogDetail' ||
      activeSection === 'friendLinkDetail'
    );

  // Avatar 鼠标视差 + 色散：仅桌面（≥1024px）启用；移动端早返回不挂监听。
  // 与 CustomCursor / GlobalHud 一致，refs + rAF + 直接写 DOM style，避免 setState
  // 引入的 react-hooks/* 警告与重渲染开销。
  const logoRef = useRef<HTMLDivElement | null>(null);
  const { isDesktop } = useResponsive();
  useEffect(() => {
    if (!isDesktop) return;
    const el = logoRef.current;
    if (!el) return;

    const MAX_OFFSET = 8;        // px，最大位移量
    const LERP = 0.12;           // 越大越跟手；越小越"轻飘"
    const targetXY = { x: 0, y: 0 };
    const currentXY = { x: 0, y: 0 };
    let splitCurrent = 0;        // 色散强度（运动中→1，静止→0）
    let rafId = 0;
    let active = false;

    const onMove = (event: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (event.clientX - w / 2) / (w / 2);
      const ny = (event.clientY - h / 2) / (h / 2);
      targetXY.x = Math.max(-1, Math.min(1, nx)) * MAX_OFFSET;
      targetXY.y = Math.max(-1, Math.min(1, ny)) * MAX_OFFSET;
      if (!active) {
        active = true;
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      const prevX = currentXY.x;
      const prevY = currentXY.y;
      currentXY.x += (targetXY.x - currentXY.x) * LERP;
      currentXY.y += (targetXY.y - currentXY.y) * LERP;
      const dx = currentXY.x;
      const dy = currentXY.y;

      // 色散基于"本帧实际位移大小"（速度）的低通滤波：
      // 鼠标停下后 lerp 步长很快趋零 → splitTarget→0 → splitCurrent 平滑衰减到 0。
      // 上升用大 alpha 让 glitch 感跟手，下降用小 alpha 形成尾迹。
      const stepX = dx - prevX;
      const stepY = dy - prevY;
      const speed = Math.hypot(stepX, stepY);          // px/帧
      const splitTarget = Math.min(1, speed * 3);      // 1/3 px/帧 = 满色散
      const splitLerp = splitTarget > splitCurrent ? 0.5 : 0.12;
      splitCurrent += (splitTarget - splitCurrent) * splitLerp;

      el.style.setProperty('--avatar-dx', `${dx.toFixed(2)}px`);
      el.style.setProperty('--avatar-dy', `${dy.toFixed(2)}px`);
      el.style.setProperty('--avatar-split', splitCurrent.toFixed(3));
      // revealLogo keyframe 的 forwards 终态会锁住 transform: scale(1)，
      // 用 !important 让我们的 inline 视差合成（translate × scale）反超它。
      el.style.setProperty(
        'transform',
        `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(1)`,
        'important',
      );

      const stillMoving =
        Math.abs(targetXY.x - currentXY.x) > 0.05 ||
        Math.abs(targetXY.y - currentXY.y) > 0.05 ||
        splitCurrent > 0.005;
      if (stillMoving) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        // 收尾：把 split 钉到 0，避免亚阈值残值
        splitCurrent = 0;
        el.style.setProperty('--avatar-split', '0');
        active = false;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
      el.style.removeProperty('--avatar-dx');
      el.style.removeProperty('--avatar-dy');
      el.style.removeProperty('--avatar-split');
      el.style.removeProperty('transform');
    };
  }, [isDesktop]);

  return (
    <div className={`${styles.leftPanel} ${leftPanelAnimated ? styles.animated : ''} ${drawerOpen ? styles.drawerOpen : ''} ${isStandalone ? styles.standaloneHide : ''}`}>
      <div className={styles.topRightDecoration}></div>
      <div className={styles.leverGroup}>
        {mainVisible && (
          <ActivationLever
            onActivate={handleActivateTesseract}
            isActive={isTesseractActivated}
            iconType="discharge"
            isAnimated={leversVisible}
            cursorLabel={chargeLeverLabel}
          />
        )}
        {mainVisible && (
          <ActivationLever
            onActivate={handleDischargeLeverPull}
            isActive={isDischarging}
            iconType="drain"
            isAnimated={leversVisible}
            cursorLabel={dischargeLeverLabel}
          />
        )}
      </div>
      <button
        className={`${styles.globalBackButton} ${showBackAndNav ? styles.visible : ''}`}
        onClick={handleGlobalBackClick}
        data-cursor-label="BACK"
        aria-label="BACK"
      >
      </button>
      <div className={`${styles.globalBackButtonDivider} ${showBackAndNav ? styles.visible : ''}`}></div>
      <div className={`${styles.leftNavLinks} ${showBackAndNav ? styles.visible : ''}`}>
        {navLinks.map((link) => (
          <button
            key={link.label}
            className={styles.leftNavLink}
            onClick={() => handleLeftNavLinkClick(link)}
          >
            {link.label}
          </button>
        ))}
        <button
          className={styles.leftNavLink}
          onClick={handleTweetsClick}
        >
          {tweetsLabel}
        </button>
        <button
          className={styles.leftNavLink}
          onClick={handleFriendsClick}
        >
          Friends
        </button>
      </div>
      <div
        ref={powerDisplayRef as Ref<HTMLDivElement>}
        className={`${styles.powerDisplay} ${isTesseractDragging ? styles.attracting : ''}`}
      >
        <div ref={batteryIconRef as Ref<HTMLDivElement>} className={styles.batteryIcon}>
          {[...Array(5)].map((_, i) => {
            const shouldBeFilled = powerLevel >= (i + 1) * 20;
            const isFilled = (i === 4 && powerLevel === 100) || shouldBeFilled;
            return (
              <span
                key={i}
                className={`${styles.batteryLevelSegment} ${isFilled ? styles.filled : ''}`}
              ></span>
            );
          })}
        </div>
        <span className={styles.powerText}>{powerLevel}%</span>
      </div>
      <div ref={logoRef} className={styles.logoContainer}></div>
      <div className={`${styles.fateTextContainer} ${isFateTypingActive ? styles.typingActive : ''}`}>
        <span className={styles.fateText}>{displayedFateText}</span>
        <div className={styles.fateLine}></div>
      </div>
      <div className={`${styles.envParamsContainer} ${isEnvParamsTyping ? styles.typingActive : ''} ${leftPanelAnimated ? styles.animated : ''}`}>
        <pre className={styles.envParamsText}>
          {displayedEnvParams}
        </pre>
      </div>
      <div className={styles.brailleText} aria-hidden="true">
        ⠠⠕⠗⠁⠉⠇⠑⠀⠠⠏⠗⠊⠑⠎⠞⠑⠎⠎⠀⠠⠁⠗⠅
      </div>
      <div
        className={`${styles.gradientLine} ${isInverted ? styles.gradientLineInverted : ''}`}
        aria-hidden="true"
      >
        {!isInverted &&
          computeBlocks(envData).map((block, index) => (
            <div
              key={index}
              className={styles.gradientSegment}
              style={{ flex: block.flex, backgroundColor: block.color }}
            />
          ))}
      </div>
      <a
        href="https://www.travellings.cn/go.html"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.travellingLink}
        aria-label="Travelling"
      >
        <img src="/travel.svg" alt="Travelling" draggable={false} />
      </a>
    </div>
  );
}
