import { startTransition, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import gsap from 'gsap';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import MDXComponents from '../../../components/mdx/MDXComponents';
import LocaleFallbackBanner from '../../../components/shared/LocaleFallbackBanner';
import HreflangLinks from '../../../components/shared/HreflangLinks';
import { AnimatedTitleChars } from '../../../components/shared/AnimatedTitleChars';
import useBlogPostState, {
  blogContentLocaleLabels,
  buildBlogPostHref,
  type BlogVariantPayload,
  type BlogPostViewState,
} from '../../../hooks/useBlogPostState';
import {
  getPostBySlugAndLocale,
  getPostMetaBySlugAndLocale,
  getAllPostsForLocale,
  getProtectedPostPublicMeta,
  getPostSlugs,
  getAvailablePostContentLocales,
  getBlogPostEntry,
  normalizeAccess,
  type BlogContentLocale,
} from '../../../lib/blog';
import type { ContentPostAccess } from '../../../lib/content/types';
import { loadMessages } from '../../../lib/i18n-data';
import type { BlogPostMeta, TranslationStatus } from '../../../types';
import styles from '../../../styles/BlogDetailView.module.scss';
import hudStyles from '../../../styles/Home.module.scss';
import accessStyles from '../../../styles/PostAccessPage.module.scss';
import { useApp } from '../../../contexts/AppContext';
import { useTransition } from '../../../contexts/TransitionContext';
import ProtectedPostGate from '../../../components/blog/ProtectedPostGate';
import BlogStateShell from '../../../components/blog/BlogStateShell';
import { getSiteUrl } from '../../../data/site';
import { locales, defaultLocale, type Locale } from '../../../i18n/config';
import { formatReadingTime } from '../../../lib/format-reading-time';
import type { ProtectedVerifyResponse } from '../../../lib/content/access-api';

interface BlogPostPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult | null;
  allPosts: BlogPostMeta[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: ContentPostAccess;
  isProtected: boolean;
}

interface BlogShellProps {
  locale: Locale;
  meta: BlogPostMeta;
  signalLabel: string;
  statusText: string;
  description?: string;
  entered?: boolean;
  error?: string;
  action?: React.ReactNode;
  isProtected?: boolean;
}

export default function BlogPostPage({
  locale,
  meta,
  mdxSource,
  allPosts,
  translationStatus,
  actualLocale,
  actualContentLocale,
  availableContentLocales,
  contentVariants,
  access,
  isProtected,
}: BlogPostPageProps) {
  const router = useRouter();
  const tCommon = useTranslations('common');
  const [hydrationReady, setHydrationReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setHydrationReady(true);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    defaultContentLocale,
    requestedContentLocale,
    viewState,
    selectedVariant,
    selectedContentLocale,
    loadingLang,
    loadError,
    effectiveStatus,
    effectiveOriginLocale,
    updateContentLocaleQuery,
    markAuthGranted,
    retryRequestedContentLocale,
  } = useBlogPostState({
    routerAsPath: router.asPath,
    locale,
    meta,
    mdxSource,
    translationStatus,
    actualLocale,
    actualContentLocale,
    availableContentLocales,
    contentVariants,
    access,
    isProtected,
    hydrationReady,
  });

  if (router.isFallback || viewState === 'authChecking') {
    return (
      <BlogStateShell
        locale={locale}
        meta={meta}
        signalLabel={tCommon('signalFragment')}
        statusText={tCommon('decoding')}
        isProtected={isProtected}
      />
    );
  }

  if (viewState === 'authRequired' && access.mode === 'totp' && access.group) {
    return (
      <ProtectedPostGate
        locale={locale}
        meta={meta}
        group={access.group}
        nextContentLocale={requestedContentLocale}
        onVerified={markAuthGranted}
      />
    );
  }

  if (!selectedVariant) {
    return (
      <BlogStateShell
        locale={locale}
        meta={meta}
        signalLabel={tCommon('signalFragment')}
        statusText={viewState === 'loadFailed' ? tCommon('loading') : tCommon('decoding')}
        error={loadError}
        action={loadError ? (
          <button
            type="button"
            className={styles.articleLocaleRetry}
            onClick={retryRequestedContentLocale}
          >
            {tCommon('retry')}
          </button>
        ) : null}
        isProtected={isProtected}
      />
    );
  }

  return (
    <BlogDetailContent
      key={`${locale}:${meta.slug}`}
      locale={locale}
      meta={selectedVariant.meta}
      mdxSource={selectedVariant.mdxSource}
      allPosts={allPosts}
      translationStatus={effectiveStatus}
      actualLocale={actualLocale}
      originLocale={effectiveOriginLocale}
      viewState={viewState}
      selectedContentLocale={selectedContentLocale}
      availableContentLocales={availableContentLocales}
      loadingLang={loadingLang}
      actualContentLocale={actualContentLocale}
      defaultContentLocale={defaultContentLocale}
      updateContentLocaleQuery={updateContentLocaleQuery}
      loadError={loadError}
      retryRequestedContentLocale={retryRequestedContentLocale}
    />
  );
}

function BlogDetailContent({
  locale,
  meta,
  mdxSource,
  allPosts,
  translationStatus,
  actualLocale,
  originLocale,
  viewState,
  selectedContentLocale,
  availableContentLocales,
  loadingLang,
  actualContentLocale,
  defaultContentLocale,
  updateContentLocaleQuery,
  loadError,
  retryRequestedContentLocale,
}: Omit<BlogPostPageProps, 'messages' | 'contentVariants' | 'access' | 'isProtected' | 'actualContentLocale' | 'mdxSource'> & {
  mdxSource: MDXRemoteSerializeResult;
  viewState: BlogPostViewState;
  selectedContentLocale: BlogContentLocale;
  originLocale: Locale;
  loadingLang: BlogContentLocale | null;
  actualContentLocale: BlogContentLocale;
  defaultContentLocale: BlogContentLocale;
  updateContentLocaleQuery: (nextContentLocale: BlogContentLocale) => void;
  loadError: string;
  retryRequestedContentLocale: () => void;
}) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const readingLabel = formatReadingTime(meta.readingMinutes, locale);

  const currentIndex = allPosts.findIndex((p) => p.slug === meta.slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [titleDone, setTitleDone] = useState(false);

  useEffect(() => {
    if (!titleRef.current) {
      startTransition(() => {
        setTitleDone(true);
      });
      return;
    }
    const timer = setTimeout(() => {
      if (!titleRef.current) {
        startTransition(() => {
          setTitleDone(true);
        });
        return;
      }
      const wrappers = titleRef.current.querySelectorAll(`.${styles.charWrapper}`);
      const inners = titleRef.current.querySelectorAll(`.${styles.charInner}`);
      if (inners.length === 0) {
        startTransition(() => {
          setTitleDone(true);
        });
        return;
      }
      wrappers.forEach((wrapper, i) => {
        const inner = inners[i];
        gsap.set(wrapper, { overflow: 'hidden', display: 'inline-block', position: 'relative', verticalAlign: 'top' });
        gsap.set(inner, { y: '110%', opacity: 0, display: 'inline-block' });
        gsap.to(inner, {
          y: '0%',
          opacity: 1,
          duration: 0.6,
          delay: 0.4 + i * 0.06,
          ease: 'power3.out',
          onComplete: i === inners.length - 1 ? () => startTransition(() => {
            setTitleDone(true);
          }) : undefined,
        });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [meta.title, selectedContentLocale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setEntered(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!titleDone) return;
    const body = contentBodyRef.current;
    const wrapper = wrapperRef.current;
    if (!body || !wrapper) return;

    const children = Array.from(body.children) as HTMLElement[];
    if (children.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting);
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${i * 0.07}s`;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          el.addEventListener('transitionend', () => {
            el.style.transitionDelay = '';
            el.style.transform = 'none';
          }, { once: true });
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px', root: wrapper },
    );

    const timer = setTimeout(() => {
      children.forEach((child) => observer.observe(child));
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [titleDone, selectedContentLocale]);

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo(`/${locale}/blog`);
  }, [navigateTo, locale]);

  const [activeNav, setActiveNav] = useState('header');
  const [isPastHeader, setIsPastHeader] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-nav-id');
            if (id) setActiveNav(id);
          }
        });
      },
      { threshold: 0.3, root: wrapper }
    );

    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.getAttribute('data-nav-id') === 'header') {
            setIsPastHeader(!entry.isIntersecting);
          }
        });
      },
      { threshold: 0.55, root: wrapper }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) {
        navObserver.observe(el);
        if (el.getAttribute('data-nav-id') === 'header') {
          headerObserver.observe(el);
        }
      }
    });

    return () => {
      navObserver.disconnect();
      headerObserver.disconnect();
    };
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navItems = useMemo(() => [
    { id: 'header', label: tNav('top') },
    { id: 'content', label: tNav('content') },
    { id: 'end', label: tNav('end') },
  ], [tNav]);

  const handleContentLocaleChange = useCallback((nextContentLocale: BlogContentLocale) => {
    if (loadingLang) {
      return;
    }
    if (nextContentLocale === selectedContentLocale && viewState !== 'loadFailed') {
      return;
    }
    updateContentLocaleQuery(nextContentLocale);
  }, [
    loadingLang,
    selectedContentLocale,
    updateContentLocaleQuery,
    viewState,
  ]);

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${meta.title} // Blog`}</title>
        <meta name="description" content={meta.excerpt} />
        {meta.access.mode === 'totp' ? <meta name="robots" content="noindex,nofollow,noarchive" /> : null}
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/blog/${meta.slug}`} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.excerpt} />
        <meta property="article:published_time" content={meta.date} />
        {meta.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <HreflangLinks basePath={`/blog/${meta.slug}`} />
      </Head>

      <div className={styles.mainContent}>

        {translationStatus !== 'source' && (
          <LocaleFallbackBanner requestedLocale={locale} actualLocale={actualLocale} originLocale={originLocale} status={translationStatus} />
        )}

        <header
          key={`header:${selectedContentLocale}`}
          className={`${styles.headerSection} ${entered ? styles.entered : ''}`}
          ref={(el) => { sectionRefs.current['header'] = el; }}
          data-nav-id="header"
        >
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{tCommon('signalFragment')}</span>
            <h1 ref={titleRef} className={styles.headerTitle}>
              <AnimatedTitleChars
                text={meta.title}
                wrapperClassName={styles.charWrapper}
                innerClassName={styles.charInner}
                wordWrapperClassName={styles.wordWrapper}
                uppercase={false}
              />
            </h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              {readingLabel && <span className={styles.headerReadingTime}>{readingLabel}</span>}
            </div>
            {availableContentLocales.length > 1 && (
              <div className={styles.articleLocaleSwitcher} aria-label="Article language switcher">
                {availableContentLocales.map((contentLocale) => (
                  <button
                    key={contentLocale}
                    type="button"
                    className={`${styles.articleLocaleButton} ${selectedContentLocale === contentLocale ? styles.activeArticleLocaleButton : ''}`}
                    onClick={() => handleContentLocaleChange(contentLocale)}
                    disabled={Boolean(loadingLang)}
                  >
                    {blogContentLocaleLabels[contentLocale]}
                  </button>
                ))}
              </div>
            )}
            {loadError ? (
              <div className={styles.articleLocaleErrorRow}>
                <p className={accessStyles.error}>{loadError}</p>
                <button
                  type="button"
                  className={styles.articleLocaleRetry}
                  onClick={retryRequestedContentLocale}
                  disabled={Boolean(loadingLang)}
                >
                  {tCommon('retry')}
                </button>
              </div>
            ) : null}
            {meta.tags.length > 0 && (
              <div className={styles.headerTags}>
                {meta.tags.map((tag) => (
                  <span key={tag} className={styles.headerTag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        <section
          key={`section:${selectedContentLocale}`}
          className={styles.contentSection}
          ref={(el) => { sectionRefs.current['content'] = el; }}
          data-nav-id="content"
        >
          {(!titleDone || viewState === 'loadingVariant') && (
            <div className={styles.loadingIndicator}>
              <span className={styles.loadingText}>{tCommon('decoding')}</span>
            </div>
          )}
          <div key={selectedContentLocale} ref={contentBodyRef} className={styles.contentBody}>
            <MDXRemote {...mdxSource} components={MDXComponents} />
          </div>
        </section>

        <footer
          className={styles.footer}
          ref={(el) => { sectionRefs.current['end'] = el; }}
          data-nav-id="end"
        >
          <div className={styles.endMarker}>
            <span className={styles.endSignal}>{tCommon('endTransmission')}</span>
          </div>
          <div className={styles.footerNav}>
            {prevPost ? (
              <Link
                href={buildBlogPostHref(locale, prevPost.slug, defaultContentLocale)}
                prefetch={prevPost.access.mode === 'public'}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={(e) => { e.preventDefault(); navigateTo(buildBlogPostHref(locale, prevPost.slug, defaultContentLocale)); }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevPost.title}</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/blog`}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{tCommon('returnToIndex')}</span>
              </Link>
            )}
            {nextPost ? (
              <Link
                href={buildBlogPostHref(locale, nextPost.slug, defaultContentLocale)}
                prefetch={nextPost.access.mode === 'public'}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={(e) => { e.preventDefault(); navigateTo(buildBlogPostHref(locale, nextPost.slug, defaultContentLocale)); }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextPost.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/blog`}
                prefetch={false}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavTitle}>{tCommon('returnToIndex')}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            )}
          </div>
        </footer>
      </div>

      <nav className={`${styles.rightNav} ${isPastHeader ? styles.visible : ''}`}>
        <button className={styles.rightNavBack} onClick={handleBack} data-cursor-label="BACK" aria-label="BACK" />
        <div className={styles.rightNavDivider} />
        {navItems.map((nav) => (
          <button
            key={nav.id}
            className={`${styles.rightNavLink} ${activeNav === nav.id ? styles.active : ''}`}
            onClick={() => scrollToSection(nav.id)}
          >
            {nav.label}
          </button>
        ))}
      </nav>

    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await getPostSlugs();
  const paths = slugs.flatMap((slug) =>
    locales.map((locale) => ({ params: { locale, slug } })),
  );
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const locale = (params?.locale as Locale) || defaultLocale;
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!slug) {
    return { notFound: true };
  }

  try {
    const entry = await getBlogPostEntry(slug);
    if (!entry) {
      return { notFound: true };
    }

    if (entry.access.mode === 'totp' && !entry.access.group) {
      return { notFound: true };
    }

    const metaResult = await getPostMetaBySlugAndLocale(slug, locale);
    const allPosts = await getAllPostsForLocale(locale);
    const messages = await loadMessages(locale);
    const availableContentLocales = await getAvailablePostContentLocales(slug);
    const access = normalizeAccess(entry.access);

    if (access.mode !== 'public') {
      return {
        props: {
          locale,
          messages,
          meta: getProtectedPostPublicMeta(metaResult.meta),
          mdxSource: null,
          allPosts,
          translationStatus: metaResult.translationStatus,
          actualLocale: metaResult.actualLocale,
          actualContentLocale: metaResult.actualContentLocale,
          availableContentLocales,
          contentVariants: {},
          access,
          isProtected: true,
        },
        revalidate: 300,
      };
    }

    const { meta, content, actualLocale, actualContentLocale, translationStatus } =
      await getPostBySlugAndLocale(slug, locale);
    const mdxSource = await serialize(content);

    return {
      props: {
        locale,
        messages,
        meta,
        mdxSource,
        allPosts,
        translationStatus,
        actualLocale,
        actualContentLocale,
        availableContentLocales,
        contentVariants: {},
        access,
        isProtected: false,
      },
      revalidate: 300,
    };
  } catch {
    return { notFound: true };
  }
};
