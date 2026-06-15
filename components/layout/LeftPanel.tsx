import type { Ref } from 'react';
import styles from '../../styles/Home.module.scss';
import ActivationLever from '../interactive/ActivationLever';

const DECORATIVE_BLOCKS = [
  { flex: 4, color: 'var(--ark-highlight-green)' },
  { flex: 36, color: '#333333' },
  { flex: 24, color: '#444444' },
  { flex: 19, color: '#666666' },
  { flex: 12, color: '#888888' },
  { flex: 5, color: '#aaaaaa' },
];

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
          DECORATIVE_BLOCKS.map((block, index) => (
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
