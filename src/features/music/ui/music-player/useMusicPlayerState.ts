import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MusicTrack } from '../../../../shared/types';
import { useSafeTimeouts } from '../../../../shared/hooks/useSafeTimeouts';
import { MUSIC_PLAYER_STORAGE_KEY } from './constants';
import { readPersistedPlayerStateFromStorage } from './persistence';
import { buildManagedAssetUrl } from '@/shared/lib/cdn';

interface UseMusicPlayerStateOptions {
  playlist: MusicTrack[];
}

function getTrackSrc(track: MusicTrack) {
  if (track.src) {
    return track.src;
  }
  if (!track.objectKey) {
    throw new Error(`Music track "${track.id}" is missing both objectKey and src`);
  }
  return buildManagedAssetUrl(track.objectKey);
}

function getAudioPath(src: string) {
  return new URL(src, window.location.origin).pathname;
}

function syncAudioSource(audio: HTMLAudioElement, src: string) {
  const currentSrcPath = audio.src ? getAudioPath(audio.src) : null;
  if (currentSrcPath === getAudioPath(src)) {
    return false;
  }

  audio.src = src;
  audio.load();
  return true;
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
  const playbackIntentRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const resumeTimeRef = useRef<number | null>(initialPersistedState?.currentTime ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialPersistedState?.currentTrackIndex ?? 0);
  const [currentTime, setCurrentTime] = useState(initialPersistedState?.currentTime ?? 0);
  const [duration, setDuration] = useState(0);
  const resolvedTrackIndex = useMemo(() => {
    if (!playlist.length) {
      return 0;
    }

    const persistedTrackId = initialPersistedState?.trackId;
    if (persistedTrackId) {
      const matchedIndex = playlist.findIndex((track) => track.id === persistedTrackId);
      if (matchedIndex !== -1) {
        return matchedIndex;
      }
    }

    return Math.max(0, Math.min(currentTrackIndex, playlist.length - 1));
  }, [currentTrackIndex, initialPersistedState?.trackId, playlist]);

  const persistPlayerState = useCallback((overrides: Partial<{
    currentTrackIndex: number;
    currentTime: number;
    isPlaying: boolean;
    trackId: string | undefined;
  }> = {}) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextState = {
      currentTrackIndex: resolvedTrackIndex,
      currentTime,
      isPlaying: playbackIntentRef.current || isPlaying,
      trackId: playlist[resolvedTrackIndex]?.id,
      ...overrides,
    };

    const serialized = JSON.stringify(nextState);
    window.sessionStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
    window.localStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
  }, [currentTime, isPlaying, playlist, resolvedTrackIndex]);

  const syncPlayState = useCallback((shouldPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    hasUserInteractedRef.current = true;
    playbackIntentRef.current = shouldPlay;
    if (!shouldPlay) {
      audio.pause();
      return;
    }

    const track = playlist[resolvedTrackIndex];
    if (track) {
      const nextSrc = getTrackSrc(track);
      syncAudioSource(audio, nextSrc);
    } else {
      playbackIntentRef.current = false;
      setIsPlaying(false);
      return;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playbackIntentRef.current = false;
        setIsPlaying(false);
      });
    }
  }, [playlist, resolvedTrackIndex]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) {
      return;
    }
    hasUserInteractedRef.current = true;
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) {
      return;
    }
    hasUserInteractedRef.current = true;
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous + 1) % playlist.length);
  }, [playlist.length]);

  const selectTrack = useCallback((index: number) => {
    if (index < 0 || index >= playlist.length) {
      return;
    }
    if (index !== currentTrackIndex) {
      hasUserInteractedRef.current = true;
      playbackIntentRef.current = true;
      resumeTimeRef.current = 0;
      setCurrentTrackIndex(index);
      return;
    }

    if (!isPlaying) {
      syncPlayState(true);
    }
  }, [currentTrackIndex, isPlaying, playlist.length, syncPlayState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.7;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const track = playlist[resolvedTrackIndex];
    if (!audio || !track) {
      return;
    }

    const nextSrc = getTrackSrc(track);
    if (!hasUserInteractedRef.current && !playbackIntentRef.current) {
      return;
    }

    if (!syncAudioSource(audio, nextSrc)) {
      return;
    }
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
              persistPlayerState({ isPlaying: false, trackId: track.id });
            });
          }
        }, 120);
      });
    }
  }, [persistPlayerState, playlist, resolvedTrackIndex, safeTimers]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const activeTrack = playlist[resolvedTrackIndex];

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
          persistPlayerState({ isPlaying: false, currentTime: audio.currentTime, trackId: activeTrack?.id });
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
  }, [handleNext, persistPlayerState, playlist, resolvedTrackIndex]);

  useEffect(() => {
    persistPlayerState();
  }, [currentTime, isPlaying, persistPlayerState, resolvedTrackIndex]);

  useEffect(() => {
    const handlePageHide = () => {
      const audio = audioRef.current;
      persistPlayerState({
        currentTime: audio ? audio.currentTime : currentTime,
        isPlaying: playbackIntentRef.current || !audio?.paused,
        trackId: playlist[resolvedTrackIndex]?.id,
      });
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [currentTime, persistPlayerState, playlist, resolvedTrackIndex]);

  const currentTrack = playlist[resolvedTrackIndex] ?? null;
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
