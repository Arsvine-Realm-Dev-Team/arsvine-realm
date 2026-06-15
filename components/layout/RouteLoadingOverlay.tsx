import styles from '../../styles/Home.module.scss';

interface RouteLoadingOverlayProps {
  presentation: 'default' | 'standalone';
  routeLoadingText: string;
  signalLabel: string;
}

export default function RouteLoadingOverlay({
  presentation,
  routeLoadingText,
  signalLabel,
}: RouteLoadingOverlayProps) {
  return (
    <div
      className={`${styles.routeLoadingOverlay} ${presentation === 'standalone' ? styles.routeLoadingOverlayStandalone : ''}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.routeLoadingCard}>
        <span className={styles.routeLoadingSignal}>{signalLabel}</span>
        <span className={styles.routeLoadingText}>{routeLoadingText}</span>
      </div>
    </div>
  );
}
