import type { MouseEventHandler } from 'react';
import Link from 'next/link';

interface DetailFooterNavItem {
  href: string;
  title: string;
  cursorLabel: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  onNavigateIntent?: () => void;
}

interface DetailFooterNavProps {
  styles: Record<string, string>;
  previous?: DetailFooterNavItem | null;
  next?: DetailFooterNavItem | null;
  fallback: DetailFooterNavItem;
}

export default function DetailFooterNav({
  styles,
  previous,
  next,
  fallback,
}: DetailFooterNavProps) {
  const previousItem = previous ?? fallback;
  const nextItem = next ?? fallback;

  return (
    <footer className={styles.footer}>
      <Link
        href={previousItem.href}
        prefetch={false}
        className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
        onClick={previousItem.onClick}
        onPointerDown={(event) => {
          if (event.button === 0) previousItem.onNavigateIntent?.();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') previousItem.onNavigateIntent?.();
        }}
        data-cursor-label={previousItem.cursorLabel}
      >
        <span className={styles.footerNavArrow}>←</span>
        <span className={styles.footerNavTitle}>{previousItem.title}</span>
      </Link>

      <Link
        href={nextItem.href}
        prefetch={false}
        className={`${styles.footerNavButton} ${styles.footerNavNext}`}
        onClick={nextItem.onClick}
        onPointerDown={(event) => {
          if (event.button === 0) nextItem.onNavigateIntent?.();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') nextItem.onNavigateIntent?.();
        }}
        data-cursor-label={nextItem.cursorLabel}
      >
        <span className={styles.footerNavTitle}>{nextItem.title}</span>
        <span className={styles.footerNavArrow}>→</span>
      </Link>
    </footer>
  );
}
