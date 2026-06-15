/* eslint-disable @next/next/no-img-element -- decorative local assets rely on plain img sizing and do not benefit from next/image here */
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import styles from '../../styles/Home.module.scss';
import Noise from '../effects/Noise';
import { siteConfig } from '../../data/site';
import { defaultLocale, isLocale } from '../../i18n/config';
import { useTransition } from '../../contexts/TransitionContext';
import { useApp } from '../../contexts/AppContext';
import useVisitorLanguageCode from '../../hooks/useVisitorLanguageCode';

export default function AboutSection({
  aboutSectionRef,
  aboutContentRef,
}) {
  const t = useTranslations('sections.about');
  const router = useRouter();
  const { navigateTo } = useTransition();
  const { runtime, currentVisitDuration } = useApp();
  const visitorLanguageCode = useVisitorLanguageCode();
  const queryLocale = router.query.locale;
  const locale = isLocale(queryLocale) ? queryLocale : defaultLocale;
  const currentYear = new Date().getFullYear();
  const yearRange =
    currentYear > siteConfig.copyrightYearStart
      ? `${siteConfig.copyrightYearStart}-${currentYear}`
      : `${siteConfig.copyrightYearStart}`;
  return (
    <div id="about-section" ref={aboutSectionRef} className={`${styles.contentSection} ${styles.aboutSection}`}>
      <Noise />
      <div ref={aboutContentRef} className={styles.aboutContentInner}>
        <h2>ABOUT</h2>
        <div className={styles.siteStatsContainer}>
          <p>{t('systemUptime')}: <span className={styles.statValue}>{runtime}</span></p>
          <p>{t('currentVisitDuration')}: <span className={styles.statValue}>{currentVisitDuration}</span></p>
          <p>{t('visitorLanguage')}: <span className={styles.statValue}>{visitorLanguageCode ?? '--'}</span></p>
        </div>
        <div className={styles.footerInfo}>
          <p>{t('codeLicense')}</p>
          <p>{t('contentLicense')}</p>
          <p>
            <a
              href={`/${locale}/copyright`}
              onClick={(e) => {
                e.preventDefault();
                navigateTo(`/${locale}/copyright`);
              }}
            >
              {t('details')}
            </a>
          </p>
          <p>© {yearRange} {siteConfig.author}.</p>
        </div>
        <div className={styles.aboutImageContainer}>
          <img
            src="/about-qr.svg"
            alt="Website QR Code"
            className={styles.aboutImage}
            draggable={false}
          />
        </div>
      </div>
      <div className={styles.aboutNewImageWrapper} aria-hidden="true">
        <div className={styles.aboutNewImageContainer}>
          <img
            src="/icons/android-chrome-512x512.png"
            alt=""
            className={`${styles.aboutNewImageBase} ${styles.aboutNewImageNormal}`}
            draggable={false}
          />
          <img
            src="/icons/android-chrome-512x512.png"
            alt=""
            className={`${styles.aboutNewImageBase} ${styles.aboutNewImageInverted}`}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
