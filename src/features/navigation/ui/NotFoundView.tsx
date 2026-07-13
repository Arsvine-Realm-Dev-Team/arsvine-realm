import Head from 'next/head';
import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import { useTransition } from '../model/TransitionProvider';
import { getSiteUrl } from '@/shared/config/site';
import { resolveLocale } from '@/shared/contracts/locale';
import styles from '../styles/NotFoundPage.module.scss';

export default function NotFoundView() {
  const router = useRouter();
  const { navigateTo } = useTransition();
  const locale = resolveLocale(router.query.locale, router.asPath);
  const t = useTranslations('pages.notFound');
  const tSite = useTranslations('pages.site');
  const requestedPath = useSyncExternalStore(
    () => () => {},
    () => (router.asPath && router.asPath !== '/404' ? router.asPath : ''),
    () => '',
  );

  return (
    <>
      <Head>
        <title>{`${t('title')} | ${tSite('title')}`}</title>
        <meta name="description" content={t('description')} />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:title" content={t('title')} />
        <meta property="og:description" content={t('description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteUrl()}${requestedPath || `/${locale}/404`}`} />
        <meta name="twitter:title" content={t('title')} />
        <meta name="twitter:description" content={t('description')} />
      </Head>

      <SectionPageLayout>
        <section className={styles.page}>
          <div className={styles.panel}>
            <p className={styles.signal}>{t('signal')}</p>

            <div className={styles.codeRow}>
              <span className={styles.code}>404</span>
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.status}>{t('status')}</span>
            </div>

            <h1 className={styles.heading}>{t('heading')}</h1>
            <p className={styles.description}>{t('description')}</p>
            <p className={styles.hint}>{t('hint')}</p>

            <p
              className={styles.pathLine}
              hidden={!requestedPath}
              aria-hidden={!requestedPath}
            >
              <span className={styles.pathLabel}>{t('pathLabel')}</span>
              <code className={styles.pathValue}>{requestedPath || '\u00A0'}</code>
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionLink}
                onClick={() => navigateTo(`/${locale}`)}
                data-cursor-label={t('returnHome')}
              >
                {t('returnHome')}
              </button>
              <button
                type="button"
                className={styles.actionLink}
                onClick={() => navigateTo(`/${locale}/content`)}
                data-cursor-label={t('returnContent')}
              >
                {t('returnContent')}
              </button>
            </div>
          </div>
        </section>
      </SectionPageLayout>
    </>
  );
}
