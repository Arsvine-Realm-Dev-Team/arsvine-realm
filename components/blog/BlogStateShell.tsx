import React, { startTransition, useEffect, useState } from 'react';
import Head from 'next/head';
import { useApp } from '../../contexts/AppContext';
import HreflangLinks from '../shared/HreflangLinks';
import { type Locale } from '../../i18n/config';
import type { BlogPostMeta } from '../../types';
import styles from '../../styles/BlogDetailView.module.scss';
import accessStyles from '../../styles/PostAccessPage.module.scss';
import hudStyles from '../../styles/Home.module.scss';

export interface BlogStateShellProps {
  locale: Locale;
  meta: BlogPostMeta;
  signalLabel: string;
  statusText: string;
  description?: string;
  error?: string;
  action?: React.ReactNode;
  isProtected?: boolean;
}

/**
 * 博客详情的三种状态外壳：
 *   - viewState === 'authChecking'：decoding transmission（轮询 token 中）
 *   - viewState === 'loadFailed'：解码失败，提供 retry 按钮
 *   - selectedVariant 不存在但已过 auth：仍渲染 decoding 占位
 *
 * 全部场景不渲染 MDX 正文与 GSAP 动画；仅头部 + loading indicator。
 */
export default function BlogStateShell({
  locale,
  meta,
  signalLabel,
  statusText,
  description,
  error,
  action,
  isProtected = false,
}: BlogStateShellProps) {
  const { isInverted } = useApp();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setEntered(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${meta.title} // Blog`}</title>
        <meta name="description" content={meta.excerpt} />
        {isProtected ? <meta name="robots" content="noindex,nofollow,noarchive" /> : null}
        <HreflangLinks basePath={`/blog/${meta.slug}`} />
      </Head>
      <div className={styles.mainContent}>
        <header className={`${styles.headerSection} ${entered ? styles.entered : ''}`}>
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{signalLabel}</span>
            <h1 className={styles.headerTitle}>{meta.title}</h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              {meta.readingMinutes > 0 ? <span className={styles.headerReadingTime}>{meta.readingMinutes}m</span> : null}
            </div>
            {description ? <p className={styles.headerExcerpt}>{description}</p> : null}
            {error ? (
              <div className={styles.articleLocaleErrorRow}>
                <p className={accessStyles.error}>{error}</p>
                {action}
              </div>
            ) : null}
          </div>
        </header>
        <section className={styles.contentSection}>
          <div className={styles.loadingIndicator}>
            <span className={styles.loadingText}>{statusText}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
