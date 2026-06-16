import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import styles from './MusicPlayer.module.scss';
import { musicPlaylist } from '../../data/music';
import { defaultLocale, isLocale, type Locale } from '../../i18n/config';
import { useResponsive } from '../../hooks/useMediaQuery';
import { useSafeTimeouts } from '../../lib/use-safe-timeouts';

// 播放器控制图标 (SVG)
const PlayIcon = () => <svg viewBox="0 0 10 10" width="10" height="10"><polygon points="3,2 8,5 3,8" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 10 10" width="10" height="10">
  <rect x="2" y="2" width="2" height="6" fill="currentColor" />
  <rect x="6" y="2" width="2" height="6" fill="currentColor" />
</svg>;
const PrevIcon = () => <svg viewBox="0 0 10 10" width="10" height="10">
  <rect x="2" y="2" width="1" height="6" fill="currentColor" />
  <polygon points="8,2 4,5 8,8" fill="currentColor" />
</svg>;
const NextIcon = () => <svg viewBox="0 0 10 10" width="10" height="10">
  <polygon points="2,2 6,5 2,8" fill="currentColor" />
  <rect x="7" y="2" width="1" height="6" fill="currentColor" />
</svg>;

// Playlist is now configured in data/music.ts —— 增删歌曲只需改那个文件，不必动本组件
const playlist = musicPlaylist;

const DRAG_THRESHOLD = 50; // 拖动切换唱片的最小像素阈值
const AUTO_COLLAPSE_DELAY = 5000; // 抽屉打开后无操作自动收起的延迟 (ms)
const MUSIC_PLAYER_STORAGE_KEY = 'arsvine:music-player';

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

function readPersistedPlayerState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(MUSIC_PLAYER_STORAGE_KEY)
      ?? window.localStorage.getItem(MUSIC_PLAYER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const currentTrackIndex = typeof parsed?.currentTrackIndex === 'number'
      ? Math.max(0, Math.min(playlist.length - 1, parsed.currentTrackIndex))
      : 0;
    const currentTime = typeof parsed?.currentTime === 'number' && parsed.currentTime >= 0
      ? parsed.currentTime
      : 0;

    return {
      currentTrackIndex,
      currentTime,
      isPlaying: parsed?.isPlaying === true,
    };
  } catch {
    return null;
  }
}

const MusicPlayer = ({ powerLevel }: { powerLevel: number }) => {
  const router = useRouter();
  const tCommon = useTranslations('common');
  const { isMobile } = useResponsive();
  const queryLocale = router.query.locale;
  const locale: Locale = isLocale(queryLocale) ? queryLocale : defaultLocale;
  const initialPersistedPlayerState = readPersistedPlayerState();
  const [isOpen, setIsOpen] = useState(false); // 初始状态为收起
  const [isPlaying, setIsPlaying] = useState(initialPersistedPlayerState?.isPlaying ?? false); // 是否正在播放
  const [isHovering, setIsHovering] = useState(false); // 鼠标是否悬停在播放器上 (用于空闲自动收起)
  const [idleNudge, setIdleNudge] = useState(0); // 触屏等场景下手动重置空闲计时器
  const audioRef = useRef<HTMLAudioElement | null>(null); // Audio 元素引用
  const safeTimers = useSafeTimeouts();

  const bumpIdleTimer = useCallback(() => {
    setIdleNudge((n) => n + 1);
  }, []);

  // 桌面端挂载 1.5s 后弹出唱片机以暗示功能；
  // 移动端不自动弹出 —— 屏幕空间有限，自动展开会遮挡正文，由用户主动点击把手触发。
  useEffect(() => {
    if (isMobile) return;
    safeTimers.setTimeout(() => {
      setIsOpen(true);
    }, 1500);
  }, [isMobile, safeTimers]);
  const [currentTime, setCurrentTime] = useState(initialPersistedPlayerState?.currentTime ?? 0); // 当前播放时间
  const [duration, setDuration] = useState(0); // 音频总时长
  const progressBarRef = useRef<HTMLDivElement | null>(null); // 进度条填充元素引用
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialPersistedPlayerState?.currentTrackIndex ?? 0); // 当前播放歌曲在列表中的索引
  const [isPlaylistVisible, setIsPlaylistVisible] = useState(false); // 播放列表是否可见

  const isFullPower = powerLevel === 100; // 是否为满电状态 (影响唱臂样式)

  // 唱片拖动相关状态
  const [isDragging, setIsDragging] = useState(false); // 是否正在拖动唱片
  const [dragStartX, setDragStartX] = useState(0); // 拖动起始 X 坐标
  // const [dragCurrentX, setDragCurrentX] = useState(0); // 当前拖动 X 坐标 (已由 dragCurrentXRef 替代主要功能)
  const [dragOffsetX, setDragOffsetX] = useState(0); // 当前唱片的水平偏移量 (用于视觉效果)
  const [incomingTrackIndex, setIncomingTrackIndex] = useState(-1); // 即将通过拖动切换到的歌曲索引 (-1 表示无)
  const [incomingTrackOffsetX, setIncomingTrackOffsetX] = useState(0); // 即将进入唱片的水平偏移量
  const vinylContainerRef = useRef<HTMLDivElement | null>(null); // 唱片机制容器引用
  const dragCurrentXRef = useRef(0); // 实时存储拖动过程中的 X 坐标 (用于 mouseup/leave 事件)
  const handleRef = useRef<HTMLDivElement | null>(null); // 播放器抽屉把手元素引用 (用于播放状态指示动画)
  const playbackIntentRef = useRef(initialPersistedPlayerState?.isPlaying ?? false); // 当前是否应在切歌后继续自动播放
  const resumeTimeRef = useRef<number | null>(initialPersistedPlayerState?.currentTime ?? null); // 刷新后待恢复的播放进度

  const persistPlayerState = useCallback((overrides = {}) => {
    if (typeof window === 'undefined') return;

    const nextState = {
      currentTrackIndex,
      currentTime,
      isPlaying: playbackIntentRef.current || isPlaying,
      ...overrides,
    };

    const serialized = JSON.stringify(nextState);
    window.sessionStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
    window.localStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
  }, [currentTime, currentTrackIndex, isPlaying]);

  // 组件挂载时设置默认音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.7; // 默认音量 70%
    }
  }, []);

  const currentTrack = playlist[currentTrackIndex]; // 当前歌曲对象
  const shouldPreloadMetadata = isPlaying || currentTime > 0;
  // 下一首和上一首的歌曲信息 (用于拖动时预览)
  const nextTrackIndex = (currentTrackIndex + 1) % playlist.length;
  const prevTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  const incomingTrack = playlist[incomingTrackIndex] ?? null; // 即将播放的歌曲对象

  // 显示的歌曲标题和艺术家
  const displayTitle = currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : "";
  const shouldMarqueeTitle = displayTitle.length > 28;
  const marqueeDuration = `${Math.max(12, displayTitle.length * 0.38)}s`;
  const resolveCommonLabel = (key: 'expandPlaylist' | 'collapsePlaylist') => {
    const translated = tCommon(key);
    return translated === key ? commonLabelFallbacks[locale][key] : translated;
  };
  const playlistToggleLabel = isPlaylistVisible
    ? resolveCommonLabel('collapsePlaylist')
    : resolveCommonLabel('expandPlaylist');

  // 抽屉打开且无用户活动一段时间后自动收起
  // 触发重置的活动：hover、拖动、播放列表展开、bumpIdleTimer (用于触屏点击)
  useEffect(() => {
    if (!isOpen) return;
    if (isHovering || isDragging || isPlaylistVisible) return;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setIsPlaylistVisible(false);
    }, AUTO_COLLAPSE_DELAY);
    return () => clearTimeout(timer);
  }, [isOpen, isHovering, isDragging, isPlaylistVisible, idleNudge]);

  // 切换抽屉展开/收起状态
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
    if (isOpen) setIsPlaylistVisible(false); // 关闭抽屉时同时隐藏播放列表
  };

  // 切换播放/暂停状态 (主要通过 audio 事件更新 isPlaying)
  const syncPlayState = useCallback((shouldPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    playbackIntentRef.current = shouldPlay;
    if (shouldPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playbackIntentRef.current = false;
          setIsPlaying(false);
        });
      }
      return;
    }

    audio.pause();
  }, []);

  const togglePlay = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation(); // 防止事件冒泡 (例如点击唱臂区域时)
    syncPlayState(!isPlaying);
  };

  // 切换到上一首 (由拖动逻辑调用)
  const handlePrev = useCallback(() => {
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + playlist.length) % playlist.length);
  }, []);

  // 切换到下一首 (由拖动逻辑调用)
  const handleNext = useCallback(() => {
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  }, []);

  // 从播放列表选择歌曲
  const selectTrack = (index: number) => {
    if (index !== currentTrackIndex) {
      playbackIntentRef.current = true;
      resumeTimeRef.current = 0;
      setCurrentTrackIndex(index);
      return;
    }

    if (!isPlaying) {
      syncPlayState(true);
    }
  };

  // 切换播放列表的可见性
  const togglePlaylist = () => {
    setIsPlaylistVisible(!isPlaylistVisible);
  };

  // 唱片拖动开始 (鼠标/触控)
  const startDrag = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    dragCurrentXRef.current = clientX;
    if (vinylContainerRef.current) {
      vinylContainerRef.current.querySelectorAll(`.${styles.vinylRecord}`).forEach(el => {
        (el as HTMLElement).style.transition = 'none';
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    startDrag(e.clientX);
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientX);
  };

  // 唱片拖动中 (鼠标/触控移动)
  const moveDrag = useCallback((clientX: number) => {
    if (!isDragging) return;
    dragCurrentXRef.current = clientX;
    const offsetX = dragCurrentXRef.current - dragStartX;
    setDragOffsetX(offsetX); // 更新当前唱片的视觉偏移

    // 根据拖动方向和距离，判断是否预显示上一首/下一首唱片
    if (offsetX > DRAG_THRESHOLD / 2) { // 向右拖 (上一首)
      setIncomingTrackIndex(prevTrackIndex);
      setIncomingTrackOffsetX(offsetX - (vinylContainerRef.current?.offsetWidth || 200));
    } else if (offsetX < -DRAG_THRESHOLD / 2) { // 向左拖 (下一首)
      setIncomingTrackIndex(nextTrackIndex);
      setIncomingTrackOffsetX(offsetX + (vinylContainerRef.current?.offsetWidth || 200));
    } else { // 未达到预显示阈值
      setIncomingTrackIndex(-1);
      setIncomingTrackOffsetX(0);
    }
  }, [isDragging, dragStartX, prevTrackIndex, nextTrackIndex]);

  const handleMouseMove = useCallback((e: MouseEvent) => moveDrag(e.clientX), [moveDrag]);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    moveDrag(e.touches[0].clientX);
  }, [moveDrag]);

  // 唱片拖动结束 (鼠标松开/触控结束)
  const handleMouseUpOrLeave = useCallback(() => {
    if (!isDragging) return;
    const finalOffsetX = dragCurrentXRef.current - dragStartX;
    setIsDragging(false);

    if (Math.abs(finalOffsetX) > DRAG_THRESHOLD) { // 拖动超过阈值，执行切换
      if (finalOffsetX > 0) { // 向右，切换到上一首
        handlePrev();
        setDragOffsetX(vinylContainerRef.current?.offsetWidth || 200); // 当前唱片滑出右侧
      } else { // 向左，切换到下一首
        handleNext();
        setDragOffsetX(-(vinylContainerRef.current?.offsetWidth || 200)); // 当前唱片滑出左侧
      }
      setIncomingTrackOffsetX(0); // 即将进入的唱片滑到中间
      // 动画结束后重置偏移和预备轨道索引
      safeTimers.setTimeout(() => {
        setDragOffsetX(0);
        setIncomingTrackIndex(-1);
      }, 300); // 延迟时间应匹配 CSS 过渡时间
    } else { // 未超过阈值，弹回原位
      setDragOffsetX(0);
      setIncomingTrackIndex(-1);
    }
    // 重置拖动起始点
    setDragStartX(0);
    // dragCurrentXRef.current 在下一次 mousedown 时会被重置
  }, [isDragging, dragStartX, handlePrev, handleNext, safeTimers]);

  // 监听拖动状态，绑定/解绑全局 mouse + touch 事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUpOrLeave);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUpOrLeave);
      window.addEventListener('touchcancel', handleMouseUpOrLeave);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpOrLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUpOrLeave);
      window.removeEventListener('touchcancel', handleMouseUpOrLeave);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpOrLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUpOrLeave);
      window.removeEventListener('touchcancel', handleMouseUpOrLeave);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUpOrLeave]);

  // 监听当前歌曲索引变化，自动加载新歌曲并根据播放意图决定是否播放
  useEffect(() => {
    if (audioRef.current && playlist[currentTrackIndex]) {
      const newSrc = playlist[currentTrackIndex].src;
      const currentFullSrcPath = audioRef.current.src ? new URL(audioRef.current.src).pathname : null;
      const newFullSrcPath = new URL(newSrc, window.location.origin).pathname;

      if (currentFullSrcPath !== newFullSrcPath) { // 仅当歌曲源不同时才加载
        audioRef.current.src = newSrc;
        audioRef.current.load();
        if (playbackIntentRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              safeTimers.setTimeout(() => {
                const retryPromise = audioRef.current?.play();
                if (retryPromise !== undefined) {
                  retryPromise.catch(() => {
                    playbackIntentRef.current = false;
                    setIsPlaying(false);
                    persistPlayerState({ isPlaying: false });
                  });
                }
              }, 120);
            });
          }
        }
      }
    }
  }, [currentTrackIndex, persistPlayerState, safeTimers]);

  // Audio 元素事件监听 (播放进度、元数据加载、播放/暂停状态、播放结束)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => { // 更新播放时间和进度条
      setCurrentTime(audio.currentTime);
      if (progressBarRef.current && duration > 0) {
        const progress = (audio.currentTime / duration) * 100;
        progressBarRef.current.style.width = `${progress}%`;
      }
    };
    const setAudioData = () => { // 音频元数据加载完成时设置总时长和当前时间
      if (resumeTimeRef.current !== null) {
        const clampedTime = audio.duration > 0
          ? Math.min(resumeTimeRef.current, audio.duration)
          : resumeTimeRef.current;
        audio.currentTime = clampedTime;
        resumeTimeRef.current = null;
      }
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      if (playbackIntentRef.current) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            playbackIntentRef.current = false;
            setIsPlaying(false);
            persistPlayerState({ isPlaying: false, currentTime: audio.currentTime });
          });
        }
      }
    };
    const setAudioPlaying = () => {
      playbackIntentRef.current = true;
      setIsPlaying(true);
    }; // 音频开始播放
    const setAudioPaused = () => setIsPlaying(false);  // 音频暂停
    const handleEnded = () => { // 音频播放结束，自动播放下一首
      playbackIntentRef.current = true;
      handleNext();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('play', setAudioPlaying);
    audio.addEventListener('pause', setAudioPaused);
    audio.addEventListener('ended', handleEnded);

    return () => { // 清理所有 Audio 事件监听器
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('play', setAudioPlaying);
      audio.removeEventListener('pause', setAudioPaused);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [duration, handleNext, persistPlayerState]); // 依赖 duration (当 duration 变化时，可能需要重新计算进度) 与稳定的 handleNext

  useEffect(() => {
    persistPlayerState();
  }, [currentTrackIndex, currentTime, isPlaying, persistPlayerState]);

  useEffect(() => {
    const handlePageHide = () => {
      const audio = audioRef.current;
      persistPlayerState({
        currentTime: audio ? audio.currentTime : currentTime,
        isPlaying: playbackIntentRef.current || !audio?.paused,
      });
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [currentTime, persistPlayerState]);

  // 处理抽屉把手上指示播放状态的动画条的随机延迟效果
  useEffect(() => {
    const handleElement = handleRef.current;
    if (!handleElement) return;
    const bars = handleElement.querySelectorAll(`.${styles.handleBar}`);

    const handleAnimationIteration = (event: Event) => {
      const bar = event.target as HTMLElement;
      bar.style.animationPlayState = 'paused'; // 暂停当前动画
      const randomDelay = Math.random() * 900 + 300; // 随机延迟 300ms - 1200ms
      safeTimers.setTimeout(() => {
        // 延迟后恢复动画
        bar.style.animationPlayState = 'running';
      }, randomDelay);
    };

    if (isPlaying) { // 播放时，为每个 bar 添加迭代监听并启动动画
      bars.forEach(bar => {
        (bar as HTMLElement).style.animationPlayState = 'running';
        bar.addEventListener('animationiteration', handleAnimationIteration);
      });
    } else {
      // 暂停时，仅重置动画状态；所有 setTimeout 已在 safeTimers 跟踪，
      // 卸载时一并清理。
      bars.forEach(bar => {
        (bar as HTMLElement).style.animationPlayState = '';
      });
    }

    return () => {
      bars.forEach(bar => bar.removeEventListener('animationiteration', handleAnimationIteration));
    };
  }, [isPlaying, safeTimers]);

  return (
    <div
      className={`${styles.playerContainer} ${isOpen ? styles.open : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={bumpIdleTimer}
    >
      {/* 抽屉把手：点击切换抽屉，播放时显示动画条和当前歌曲名 (若收起) */}
      <div
        ref={handleRef}
        className={`
          ${styles.handle} 
          ${!isOpen && isPlaying ? styles.expanded : ''} 
          ${isPlaying ? styles.playing : ''}
        `}
        onClick={toggleDrawer}
        data-cursor-magnetic
      >
        {/* 动画线条容器 */}
        <div className={styles.handleBarsContainer}>
          {[...Array(7)].map((_, i) => <div key={i} className={styles.handleBar}></div>)}
        </div>

        {/* 收起且播放时，在把手上显示当前歌曲名 (竖排) */}
        {!isOpen && isPlaying && currentTrack && (
          <div className={styles.handleTrackInfo}>
            <div className={styles.handleTrackTitle}>
              {currentTrack.title || ''}
            </div>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        // 进入站点时不应预拉音频。preload="none" 让浏览器在用户真正
        // 点击播放（play()）前不发任何网络请求；本组件下面 effect 里的
        // audio.load() 在 preload="none" 下也只是把媒体状态机重置到
        // NETWORK_IDLE，不会触发 fetch。代价是首次播放前看不到准确的
        // duration——可接受的取舍。
        preload={shouldPreloadMetadata ? 'metadata' : 'none'}
        onError={() => { setIsPlaying(false); }}
      />

      {/* 唱片拖动切换机制容器 */}
      <div
        ref={vinylContainerRef}
        className={styles.vinylMechanismContainer}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className={styles.vinylPlatter}> {/* 唱盘 (固定部分) */}
          {/* 当前播放的唱片 */}
          <div
            className={`${styles.vinylRecord} ${isPlaying ? styles.recordSpinning : ''}`}
            style={{ transform: `translateX(${dragOffsetX}px)` }}
          >
            <div className={styles.vinylLabel}></div> {/* 唱片中心标签 */}
          </div>
          {/* 即将进入的唱片 (拖动时预览) */}
          {incomingTrackIndex !== -1 && incomingTrack && (
            <div
              className={`${styles.vinylRecord} ${styles.incomingVinylRecord}`}
              style={{
                transform: `translateX(${incomingTrackOffsetX}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out', // 拖动时无过渡，松开时有过渡
                opacity: 1 // 始终可见，通过位置控制显示
              }}
            >
              <div className={styles.vinylLabel}></div>
            </div>
          )}
        </div>

        {/* 唱臂组件：点击区域控制播放/暂停，播放时有动画 */}
        <div className={`${styles.tonearmAssembly} ${isPlaying ? styles.tonearmPlaying : ''}`}>
          <div
            className={styles.tonearmHitbox} // 唱臂的点击热区
            onClick={togglePlay}
            title={isPlaying ? "暂停" : "播放"}
          ></div>
          <div
            className={`${styles.tonearm} ${!isFullPower ? styles.tonearmLowPower : ''}`}
            style={{ boxShadow: isPlaying && isFullPower ? '0 0 5px rgba(var(--ark-primary-rgb), 0.3)' : 'none' }}
          />
        </div>
      </div>

      {/* 播放器主要内容区域 (抽屉内) */}
      <div className={styles.playerContent}>
        <div className={styles.trackInfoContainer}> {/* 歌曲信息与播放列表切换按钮容器 */}
          <div className={styles.trackInfo}>
            <div
              className={`${styles.trackTitle} ${shouldMarqueeTitle ? styles.trackTitleMarquee : ''}`}
              style={shouldMarqueeTitle
                ? { '--track-marquee-duration': marqueeDuration } as React.CSSProperties
                : undefined}
            >
              {shouldMarqueeTitle ? (
                <div className={styles.trackTitleMarqueeInner}>
                  <span>{displayTitle}</span>
                  <span aria-hidden="true">{displayTitle}</span>
                </div>
              ) : displayTitle}
            </div>
          </div>
          <button
            className={`${styles.playlistToggleButton} ${!isFullPower ? styles.toggleButtonLowPower : ''}`}
            onClick={togglePlaylist}
            aria-label={playlistToggleLabel}
            data-cursor-label={playlistToggleLabel}
          >
            {[...Array(3)].map((_, i) => <span key={i} className={styles.toggleButtonLine}></span>)}
          </button>
        </div>
        <div className={styles.progressBarContainer}> {/* 播放进度条 */}
          <div ref={progressBarRef} className={styles.progressBar}></div>
        </div>
      </div>

      {/* 播放列表 */}
      <div className={`${styles.playlistContainer} ${isPlaylistVisible ? styles.visible : ''}`}>
        {playlist.map((track, index) => (
          <div
            key={index}
            className={`${styles.playlistItem} ${index === currentTrackIndex ? styles.activePlaylistItem : ''}`}
            onClick={() => selectTrack(index)}
          >
            <span className={styles.playlistItemTitle}>{track.title}</span>
            <span className={styles.playlistItemArtist}>{track.artist}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer; 
