import styles from '../MusicPlayer.module.scss';

interface VinylDeckProps {
  dragOffsetX: number;
  incomingTrackOffsetX: number;
  isDragging: boolean;
  isFullPower: boolean;
  isPlaying: boolean;
  pauseTitle: string;
  onTogglePlay: () => void;
  onStartDrag: (clientX: number) => void;
  incomingTrackVisible: boolean;
  playTitle: string;
  setContainerRef: (element: HTMLDivElement | null) => void;
}

export default function VinylDeck({
  dragOffsetX,
  incomingTrackOffsetX,
  isDragging,
  isFullPower,
  isPlaying,
  pauseTitle,
  onTogglePlay,
  onStartDrag,
  incomingTrackVisible,
  playTitle,
  setContainerRef,
}: VinylDeckProps) {
  return (
    <div
      ref={setContainerRef}
      className={styles.vinylMechanismContainer}
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        onStartDrag(event.clientX);
        event.preventDefault();
      }}
      onTouchStart={(event) => {
        if (event.touches.length !== 1) {
          return;
        }

        onStartDrag(event.touches[0].clientX);
      }}
    >
      <div className={styles.vinylPlatter}>
        <div
          className={`${styles.vinylRecord} ${isPlaying ? styles.recordSpinning : ''}`}
          style={{
            transform: `translateX(${dragOffsetX}px)`,
            transition: isDragging ? 'none' : undefined,
          }}
        >
          <div className={styles.vinylLabel} />
        </div>
        {incomingTrackVisible && (
          <div
            className={`${styles.vinylRecord} ${styles.incomingVinylRecord}`}
            style={{
              transform: `translateX(${incomingTrackOffsetX}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: 1,
            }}
          >
            <div className={styles.vinylLabel} />
          </div>
        )}
      </div>

      <div className={`${styles.tonearmAssembly} ${isPlaying ? styles.tonearmPlaying : ''}`}>
        <div
          className={styles.tonearmHitbox}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePlay();
          }}
          title={isPlaying ? pauseTitle : playTitle}
        />
        <div
          className={`${styles.tonearm} ${!isFullPower ? styles.tonearmLowPower : ''}`}
          style={{ boxShadow: isPlaying && isFullPower ? '0 0 5px rgba(var(--ark-primary-rgb), 0.3)' : 'none' }}
        />
      </div>
    </div>
  );
}
