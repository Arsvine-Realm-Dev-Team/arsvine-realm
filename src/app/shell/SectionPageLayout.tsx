import type { ReactNode } from 'react';
import styles from '../styles/Shell.module.scss';

export default function SectionPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.contentWrapper} style={{ pointerEvents: 'auto' }}>
      {children}
    </div>
  );
}
