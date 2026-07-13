import React, { useRef, useImperativeHandle } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../HomeLoadingScreen.module.scss';
import gsap from 'gsap';
import { siteConfig } from '@/shared/config/site';

export interface LogoTitleRef {
  container: HTMLDivElement | null;
  mainTitle: HTMLHeadingElement | null;
  animateIn: (delay?: number) => void;
}

function LogoTitle({ ref }: { ref?: React.Ref<LogoTitleRef> }) {
  const tSite = useTranslations('pages.site');
  const logoAreaRef = useRef<HTMLDivElement>(null);
  const mainTitleRef = useRef<HTMLHeadingElement>(null);

  useImperativeHandle(ref, () => ({
    container: logoAreaRef.current,
    mainTitle: mainTitleRef.current,
    animateIn: (delay = 0.8) => {
      if (!mainTitleRef.current) return;
      const charWrappers = mainTitleRef.current.querySelectorAll(`.${styles.char_wrapper}`);
      const inners = mainTitleRef.current.querySelectorAll(`.${styles.char_inner}`);
      
      charWrappers.forEach((wrapper, i) => {
        const inner = inners[i];
        gsap.set(wrapper, { overflow: 'hidden', display: 'inline-block', position: 'relative', verticalAlign: 'top' });
        gsap.set(inner, { y: '110%', opacity: 0, display: 'inline-block' });

        gsap.to(inner, { 
          y: '0%', 
          opacity: 0.8,
          duration: 0.6,
          delay: delay + i * 0.12,
          ease: 'power3.out' 
        });
      });

      // Animate subtitle
      const subTitle = logoAreaRef.current?.querySelector(`.${styles.logo_subtitle}`) as HTMLElement;
      if (subTitle) {
        gsap.set(subTitle, { opacity: 0 }); // Ensure it starts invisible immediately
        gsap.to(subTitle, 
          { opacity: 1, duration: 1.5, delay: delay + 0.3, ease: 'power2.inOut', onStart: () => { gsap.set(subTitle, { visibility: 'visible' }) } }
        );
      }
    }
  }));

  return (
    <div ref={logoAreaRef} className={styles.logo_area}>
      <div className={styles.title_container}>
        <h1 ref={mainTitleRef} className={styles.main_title}>
          {siteConfig.name.split("").map((char, index) => (
            <span key={`site-${char}-${index}`} className={styles.char_wrapper}>
              <span className={styles.char_inner}>
                {char === " " ? " " : char}
              </span>
            </span>
          ))}
        </h1>
        <div
          className={styles.logo_subtitle}
          style={{ opacity: 0, visibility: 'hidden' }}
          suppressHydrationWarning
        >
          {tSite('loadingSubtitle')}
        </div>
      </div>
    </div>
  );
}

LogoTitle.displayName = 'LogoTitle';

export default LogoTitle;
