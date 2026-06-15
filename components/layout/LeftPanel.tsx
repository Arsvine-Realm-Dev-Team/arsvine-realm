import type { Ref } from 'react';
import styles from '../../styles/Home.module.scss';
import ActivationLever from '../interactive/ActivationLever';
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
      <div className={styles.logoContainer}></div>
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
