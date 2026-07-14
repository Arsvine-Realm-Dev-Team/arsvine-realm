import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicPlayerState } from '@/features/music/ui/music-player/useMusicPlayerState';
import type { MusicTrack } from '@/features/music/contracts/musicTrack';

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

  it('ignores a stale play rejection after a newer track starts playing', async () => {
    let rejectFirstPlay: ((reason?: unknown) => void) | undefined;
    playMock
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
        rejectFirstPlay = reject;
      }))
      .mockResolvedValue(undefined);
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'track-two' }));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    fireEvent.play(audio);
    expect(screen.getByTestId('playing-state').textContent).toBe('true');

    await act(async () => {
      rejectFirstPlay?.(new DOMException('superseded', 'AbortError'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('playing-state').textContent).toBe('true');
  });

  it('does not write storage on every timeupdate event', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<MusicPlayerStateHarness />);
    const writesAfterMount = setItem.mock.calls.length;
    const audio = screen.getByTestId('audio') as HTMLAudioElement;

    for (let second = 1; second <= 20; second += 1) {
      audio.currentTime = second / 4;
      fireEvent.timeUpdate(audio);
    }

    expect(setItem.mock.calls.length).toBeLessThanOrEqual(writesAfterMount + 2);
  });
});
