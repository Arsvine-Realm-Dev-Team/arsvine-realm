import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MusicTrack } from '../../../types';
import { useSafeTimeouts } from '../../../lib/use-safe-timeouts';
import { MUSIC_PLAYER_STORAGE_KEY } from './constants';
import { readPersistedPlayerStateFromStorage } from './persistence';

interface UseMusicPlayerStateOptions {
  playlist: MusicTrack[];
}

export function useMusicPlayerState({ playlist }: UseMusicPlayerStateOptions) {
  const safeTimers = useSafeTimeouts();
  const initialPersistedState = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return readPersistedPlayerStateFromStorage(
      window.sessionStorage,
      window.localStorage,
      MUSIC_PLAYER_STORAGE_KEY,
      playlist.length,
    );
  }, [playlist.length]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntentRef = useRef(initialPersistedState?.isPlaying ?? false);
  const resumeTimeRef = useRef<number | null>(initialPersistedState?.currentTime ?? null);
  const [isPlaying, setIsPlaying] = useState(initialPersistedState?.isPlaying ?? false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialPersistedState?.currentTrackIndex ?? 0);
  const [currentTime, setCurrentTime] = useState(initialPersistedState?.currentTime ?? 0);
  const [duration, setDuration] = useState(0);

  const persistPlayerState = useCallback((overrides: Partial<{
    currentTrackIndex: number;
    currentTime: number;
    isPlaying: boolean;
  }> = {}) => {
    if (typeof window === 'undefined') {
      return;
    }

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

  const syncPlayState = useCallback((shouldPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    playbackIntentRef.current = shouldPlay;
    if (!shouldPlay) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playbackIntentRef.current = false;
        setIsPlaying(false);
      });
    }
  }, []);

  const handlePrev = useCallback(() => {
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous + 1) % playlist.length);
  }, [playlist.length]);

  const selectTrack = useCallback((index: number) => {
    if (index !== currentTrackIndex) {
      playbackIntentRef.current = true;
      resumeTimeRef.current = 0;
      setCurrentTrackIndex(index);
      return;
    }

    if (!isPlaying) {
      syncPlayState(true);
    }
  }, [currentTrackIndex, isPlaying, syncPlayState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.7;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const track = playlist[currentTrackIndex];
    if (!audio || !track) {
      return;
    }

    const nextSrcPath = new URL(track.src, window.location.origin).pathname;
    const currentSrcPath = audio.src ? new URL(audio.src).pathname : null;
    if (currentSrcPath === nextSrcPath) {
      return;
    }

    audio.src = track.src;
    audio.load();
    if (!playbackIntentRef.current) {
      return;
    }

    const playPromise = audio.play();
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
  }, [currentTrackIndex, persistPlayerState, playlist, safeTimers]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
    };

    const setAudioData = () => {
      if (resumeTimeRef.current !== null) {
        const clampedTime = audio.duration > 0
          ? Math.min(resumeTimeRef.current, audio.duration)
          : resumeTimeRef.current;
        audio.currentTime = clampedTime;
        resumeTimeRef.current = null;
      }

      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);

      if (!playbackIntentRef.current) {
        return;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playbackIntentRef.current = false;
          setIsPlaying(false);
          persistPlayerState({ isPlaying: false, currentTime: audio.currentTime });
        });
      }
    };

    const setAudioPlaying = () => {
      playbackIntentRef.current = true;
      setIsPlaying(true);
    };

    const setAudioPaused = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      playbackIntentRef.current = true;
      handleNext();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('play', setAudioPlaying);
    audio.addEventListener('pause', setAudioPaused);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('play', setAudioPlaying);
      audio.removeEventListener('pause', setAudioPaused);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleNext, persistPlayerState]);

  useEffect(() => {
    persistPlayerState();
  }, [currentTime, currentTrackIndex, isPlaying, persistPlayerState]);

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

  const currentTrack = playlist[currentTrackIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shouldPreloadMetadata = isPlaying || currentTime > 0;

  return {
    audioRef,
    currentTrack,
    currentTrackIndex,
    currentTime,
    duration,
    handleNext,
    handlePrev,
    isPlaying,
    persistPlayerState,
    playbackIntentRef,
    progressPercent,
    resumeTimeRef,
    selectTrack,
    setIsPlaying,
    shouldPreloadMetadata,
    syncPlayState,
  };
}
