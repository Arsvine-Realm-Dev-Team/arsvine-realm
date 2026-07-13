import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicPlayerState } from '@/features/music/ui/music-player/useMusicPlayerState';
import type { MusicTrack } from '@/shared/types';

const playlist: MusicTrack[] = [
  {
    id: 'track-one',
    title: 'Track One',
    artist: 'Artist One',
    src: 'https://cdn.arsvine.com/music/track-one.m4a',
  },
  {
    id: 'track-two',
    title: 'Track Two',
    artist: 'Artist Two',
    src: 'https://cdn.arsvine.com/music/track-two.m4a',
  },
];

function MusicPlayerStateHarness() {
  const {
    audioRef,
    currentTrack,
    isPlaying,
    selectTrack,
    syncPlayState,
  } = useMusicPlayerState({ playlist });

  return (
    <div>
      <audio ref={audioRef} data-testid="audio" />
      <div data-testid="current-track">{currentTrack.title}</div>
      <div data-testid="playing-state">{String(isPlaying)}</div>
      <button type="button" onClick={() => syncPlayState(true)}>
        play
      </button>
      <button type="button" onClick={() => selectTrack(1)}>
        track-two
      </button>
    </div>
  );
}

describe('useMusicPlayerState audio loading', () => {
  const playMock = vi.fn();
  const loadMock = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    playMock.mockReset().mockResolvedValue(undefined);
    loadMock.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(loadMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not request audio on initial render', () => {
    render(<MusicPlayerStateHarness />);

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBeNull();
    expect(loadMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('current-track').textContent).toBe('Track One');
    expect(screen.getByTestId('playing-state').textContent).toBe('false');
  });

  it('loads and plays only after the play control is clicked', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(playlist[0].src);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('does not reload the current source when play is requested again', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'play' }));

    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('loads and plays the selected track after a user track change', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'track-two' }));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(playlist[1].src);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
  });

  it('does not load audio on mount even when persisted state says playing', () => {
    const persisted = JSON.stringify({
      currentTrackIndex: 1,
      currentTime: 42,
      isPlaying: true,
    });
    window.sessionStorage.setItem('arsvine:music-player', persisted);

    render(<MusicPlayerStateHarness />);

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBeNull();
    expect(loadMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
    expect(screen.getByTestId('playing-state').textContent).toBe('false');
  });
});
