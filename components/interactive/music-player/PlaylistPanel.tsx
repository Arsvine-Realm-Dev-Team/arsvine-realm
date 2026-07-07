import type { MusicTrack } from '../../../types';
import styles from '../MusicPlayer.module.scss';

interface PlaylistPanelProps {
  currentTrackIndex: number;
  isVisible: boolean;
  playlist: MusicTrack[];
  onSelectTrack: (index: number) => void;
}

export default function PlaylistPanel({
  currentTrackIndex,
  isVisible,
  playlist,
  onSelectTrack,
}: PlaylistPanelProps) {
  return (
    <div className={`${styles.playlistContainer} ${isVisible ? styles.visible : ''}`}>
      {playlist.map((track, index) => (
        <div
          key={track.src}
          className={`${styles.playlistItem} ${index === currentTrackIndex ? styles.activePlaylistItem : ''}`}
          onClick={() => onSelectTrack(index)}
        >
          <span className={styles.playlistItemTitle}>{track.title}</span>
          <span className={styles.playlistItemArtist}>{track.artist}</span>
        </div>
      ))}
    </div>
  );
}
