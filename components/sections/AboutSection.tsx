import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import styles from '../../styles/Home.module.scss';
import Noise from '../effects/Noise';
import { siteConfig } from '../../data/site';
import { defaultLocale, isLocale } from '../../i18n/config';
import { useTransition } from '../../contexts/TransitionContext';

export default function AboutSection({
  aboutSectionRef,
  aboutContentRef,
  runtime,
  totalVisits,
  currentVisitors,
}) {
  const t = useTranslations('sections.about');
  const router = useRouter();
  const { navigateTo } = useTransition();
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
          <p>{t('systemUptime')}: {runtime}</p>
          <p>{t('totalVisits')}: {totalVisits}</p>
          <p>{t('onlineNow')}: {currentVisitors}</p>
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

      </div>

    </div>
  );
}
