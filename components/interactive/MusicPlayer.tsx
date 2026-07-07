import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import styles from './MusicPlayer.module.scss';
import { musicPlaylist } from '../../data/music';
import { defaultLocale, isLocale, type Locale } from '../../i18n/config';
import { useResponsive } from '../../hooks/useMediaQuery';
import { useSafeTimeouts } from '../../lib/use-safe-timeouts';
import { AUTO_COLLAPSE_DELAY } from './music-player/constants';
import PlayerControls from './music-player/PlayerControls';
import PlaylistPanel from './music-player/PlaylistPanel';
import { useMusicPlayerState } from './music-player/useMusicPlayerState';
import { useVinylDrag } from './music-player/useVinylDrag';
import VinylDeck from './music-player/VinylDeck';

const playlist = musicPlaylist;

const commonLabelFallbacks: Record<Locale, Record<'expandPlaylist' | 'collapsePlaylist', string>> = {
  'zh-CN': {
    expandPlaylist: '展开列表',
    collapsePlaylist: '收起列表',
  },
  'zh-TW': {
    expandPlaylist: '展開列表',
    collapsePlaylist: '收起列表',
  },
  en: {
    expandPlaylist: 'Open Playlist',
    collapsePlaylist: 'Close Playlist',
  },
};

const HANDLE_BAR_COUNT = 7;

const MusicPlayer = ({ powerLevel }: { powerLevel: number }) => {
  const router = useRouter();
  const tCommon = useTranslations('common');
  const { isMobile } = useResponsive();
  const safeTimers = useSafeTimeouts();
  const queryLocale = router.query.locale;
  const locale: Locale = isLocale(queryLocale) ? queryLocale : defaultLocale;

  const [isOpen, setIsOpen] = useState(false);
  const [isPlaylistVisible, setIsPlaylistVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [idleNudge, setIdleNudge] = useState(0);
  const handleRef = useRef<HTMLDivElement | null>(null);

  const {
    audioRef,
    currentTrack,
    currentTrackIndex,
    handleNext,
    handlePrev,
    isPlaying,
    progressPercent,
    selectTrack,
    setIsPlaying,
    shouldPreloadMetadata,
    syncPlayState,
  } = useMusicPlayerState({ playlist });

  const {
    dragOffsetX,
    incomingTrack,
    incomingTrackIndex,
    incomingTrackOffsetX,
    isDragging,
    setVinylContainer,
    startDrag,
  } = useVinylDrag({
    playlist,
    currentTrackIndex,
    onPrev: handlePrev,
    onNext: handleNext,
    safeTimers,
  });

  const bumpIdleTimer = useCallback(() => {
    setIdleNudge((value) => value + 1);
  }, []);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    safeTimers.setTimeout(() => {
      setIsOpen(true);
    }, 1500);
  }, [isMobile, safeTimers]);

  useEffect(() => {
    if (!isOpen || isHovering || isDragging || isPlaylistVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      setIsPlaylistVisible(false);
    }, AUTO_COLLAPSE_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [idleNudge, isDragging, isHovering, isOpen, isPlaylistVisible]);

  useEffect(() => {
    const handleElement = handleRef.current;
    if (!handleElement) {
      return;
    }

    const bars = handleElement.querySelectorAll(`.${styles.handleBar}`);
    const handleAnimationIteration = (event: Event) => {
      const bar = event.target as HTMLElement;
      bar.style.animationPlayState = 'paused';
      const randomDelay = Math.random() * 900 + 300;
      safeTimers.setTimeout(() => {
        bar.style.animationPlayState = 'running';
      }, randomDelay);
    };

    if (isPlaying) {
      bars.forEach((bar) => {
        (bar as HTMLElement).style.animationPlayState = 'running';
        bar.addEventListener('animationiteration', handleAnimationIteration);
      });
    } else {
      bars.forEach((bar) => {
        (bar as HTMLElement).style.animationPlayState = '';
      });
    }

    return () => {
      bars.forEach((bar) => {
        bar.removeEventListener('animationiteration', handleAnimationIteration);
      });
    };
  }, [isPlaying, safeTimers]);

  const isFullPower = powerLevel === 100;
  const displayTitle = currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : '';
  const shouldMarqueeTitle = displayTitle.length > 28;
  const marqueeDuration = `${Math.max(12, displayTitle.length * 0.38)}s`;
  const resolveCommonLabel = (key: 'expandPlaylist' | 'collapsePlaylist') => {
    const translated = tCommon(key);
    return translated === key ? commonLabelFallbacks[locale][key] : translated;
  };
  const playlistToggleLabel = isPlaylistVisible
    ? resolveCommonLabel('collapsePlaylist')
    : resolveCommonLabel('expandPlaylist');

  return (
    <div
      className={`${styles.playerContainer} ${isOpen ? styles.open : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={bumpIdleTimer}
    >
      <div
        ref={handleRef}
        className={`${styles.handle} ${!isOpen && isPlaying ? styles.expanded : ''} ${isPlaying ? styles.playing : ''}`}
        onClick={() => {
          setIsOpen((value) => {
            if (value) {
              setIsPlaylistVisible(false);
            }
            return !value;
          });
        }}
        data-cursor-magnetic
      >
        <div className={styles.handleBarsContainer}>
          {[...Array(HANDLE_BAR_COUNT)].map((_, index) => (
            <div key={index} className={styles.handleBar} />
          ))}
        </div>
        {!isOpen && isPlaying && currentTrack && (
          <div className={styles.handleTrackInfo}>
            <div className={styles.handleTrackTitle}>{currentTrack.title}</div>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        preload={shouldPreloadMetadata ? 'metadata' : 'none'}
        onError={() => {
          setIsPlaying(false);
        }}
      />

      <VinylDeck
        dragOffsetX={dragOffsetX}
        incomingTrackOffsetX={incomingTrackOffsetX}
        incomingTrackVisible={incomingTrackIndex !== -1 && !!incomingTrack}
        isDragging={isDragging}
        isFullPower={isFullPower}
        isPlaying={isPlaying}
        onTogglePlay={() => syncPlayState(!isPlaying)}
        onStartDrag={startDrag}
        setContainerRef={setVinylContainer}
      />

      <PlayerControls
        displayTitle={displayTitle}
        isFullPower={isFullPower}
        isPlaylistVisible={isPlaylistVisible}
        playlistToggleLabel={playlistToggleLabel}
        progressPercent={progressPercent}
        shouldMarqueeTitle={shouldMarqueeTitle}
        marqueeDuration={marqueeDuration}
        onTogglePlaylist={() => {
          setIsPlaylistVisible((value) => !value);
        }}
      />

      <PlaylistPanel
        currentTrackIndex={currentTrackIndex}
        isVisible={isPlaylistVisible}
        playlist={playlist}
        onSelectTrack={selectTrack}
      />
    </div>
  );
};

export default MusicPlayer;
