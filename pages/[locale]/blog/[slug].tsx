import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import {
  getPostBySlugAndLocale,
  getPostBySlugAndContentLocale,
  getPostSlugs,
  getAllPostsForLocale,
  getAvailablePostContentLocales,
  type BlogContentLocale,
} from '../../../lib/blog';
import { loadMessages } from '../../../lib/i18n-data';
import type { BlogPostMeta, TranslationStatus } from '../../../types';
import styles from '../../../styles/BlogDetailView.module.scss';
import hudStyles from '../../../styles/Home.module.scss';
import { useApp } from '../../../contexts/AppContext';
import { useTransition } from '../../../contexts/TransitionContext';
import { getSiteUrl } from '../../../data/site';
import { locales, type Locale } from '../../../i18n/config';
import { formatReadingTime } from '../../../lib/format-reading-time';

const blogContentLocaleLabels: Record<BlogContentLocale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'English',
  ja: '日本語',
  ru: 'Русский',
  fr: 'Français',
};

function isBlogContentLocale(value: unknown): value is BlogContentLocale {
  return typeof value === 'string' && value in blogContentLocaleLabels;
}

interface BlogVariantPayload {
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
}

interface BlogPostPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
  allPosts: BlogPostMeta[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
}

export default function BlogPostPage({
  locale,
  meta,
  mdxSource,
  allPosts,
  translationStatus,
  actualLocale,
  availableContentLocales,
  contentVariants,
}: BlogPostPageProps) {
  const router = useRouter();
  const queryLang = Array.isArray(router.query.lang) ? router.query.lang[0] : router.query.lang;
  const selectedContentLocale = isBlogContentLocale(queryLang) && contentVariants[queryLang]
    ? queryLang
    : actualLocale;
  const selectedVariant = contentVariants[selectedContentLocale] ?? { meta, mdxSource };
  // 用户手动通过 ?lang= 切换内容语言时，无论原状态如何都不再提示（视为已知行为）
  const suppressFallbackBanner = Boolean(queryLang && isBlogContentLocale(queryLang));
  const effectiveStatus: TranslationStatus = suppressFallbackBanner
    ? 'source'
    : translationStatus;
  // originLocale 取自当前展示内容的 frontmatter；缺省按默认 locale 算
  const effectiveOriginLocale: Locale = (selectedVariant.meta.originLocale
    ?? meta.originLocale
    ?? actualLocale) as Locale;

  if (router.isFallback) {
    return <BlogLoadingShell />;
  }

  return (
    <BlogDetailContent
      key={`${locale}:${selectedVariant.meta.slug}:${selectedContentLocale}`}
      locale={locale}
      meta={selectedVariant.meta}
      mdxSource={selectedVariant.mdxSource}
      allPosts={allPosts}
      translationStatus={effectiveStatus}
      actualLocale={actualLocale}
      originLocale={effectiveOriginLocale}
      selectedContentLocale={selectedContentLocale}
      availableContentLocales={availableContentLocales}
    />
  );
}

function BlogLoadingShell() {
  const { isInverted } = useApp();
  const tCommon = useTranslations('common');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head><title>{tCommon('loading')}</title></Head>
      <div className={styles.mainContent}>
        <header className={`${styles.headerSection} ${entered ? styles.entered : ''}`}>
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{tCommon('signalFragment')}</span>
          </div>
        </header>
        <section className={styles.contentSection}>
          <div className={styles.loadingIndicator}>
            <span className={styles.loadingText}>{tCommon('decoding')}</span>
          </div>
        </section>
      </div>
    </div>
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
  selectedContentLocale,
  availableContentLocales,
}: Omit<BlogPostPageProps, 'messages' | 'contentVariants'> & { selectedContentLocale: BlogContentLocale; originLocale: Locale }) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const router = useRouter();
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
    if (!titleRef.current) { setTitleDone(true); return; }
    const timer = setTimeout(() => {
      if (!titleRef.current) { setTitleDone(true); return; }
      const wrappers = titleRef.current.querySelectorAll(`.${styles.charWrapper}`);
      const inners = titleRef.current.querySelectorAll(`.${styles.charInner}`);
      if (inners.length === 0) { setTitleDone(true); return; }
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
          onComplete: i === inners.length - 1 ? () => setTitleDone(true) : undefined,
        });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 100);
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
  }, [titleDone]);

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
    const nextQuery = { ...router.query };
    if (nextContentLocale === actualLocale) {
      delete nextQuery.lang;
    } else {
      nextQuery.lang = nextContentLocale;
    }
    router.push({ pathname: router.pathname, query: nextQuery }, undefined, { scroll: false, shallow: true });
  }, [actualLocale, router]);

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${meta.title} // Blog`}</title>
        <meta name="description" content={meta.excerpt} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/blog/${meta.slug}`} />
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
          className={`${styles.headerSection} ${entered ? styles.entered : ''}`}
          ref={(el) => { sectionRefs.current['header'] = el; }}
          data-nav-id="header"
        >
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{tCommon('signalFragment')}</span>
            <h1 ref={titleRef} className={styles.headerTitle}>
              {meta.title.split("").map((char, i) => (
                <span key={`t-${i}`} className={styles.charWrapper}>
                  <span className={styles.charInner}>{char === ' ' ? ' ' : char}</span>
                </span>
              ))}
            </h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              {readingLabel && <span className={styles.headerReadingTime}>{readingLabel}</span>}
            </div>
            {meta.slug === 'init' && availableContentLocales.length > 1 && (
              <div className={styles.articleLocaleSwitcher} aria-label="Article language switcher">
                {availableContentLocales.map((contentLocale) => (
                  <button
                    key={contentLocale}
                    type="button"
                    className={`${styles.articleLocaleButton} ${selectedContentLocale === contentLocale ? styles.activeArticleLocaleButton : ''}`}
                    onClick={() => handleContentLocaleChange(contentLocale)}
                  >
                    {blogContentLocaleLabels[contentLocale]}
                  </button>
                ))}
              </div>
            )}
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
          className={styles.contentSection}
          ref={(el) => { sectionRefs.current['content'] = el; }}
          data-nav-id="content"
        >
          {!titleDone && (
            <div className={styles.loadingIndicator}>
              <span className={styles.loadingText}>{tCommon('decoding')}</span>
            </div>
          )}
          <div ref={contentBodyRef} className={styles.contentBody}>
            <MDXRemote {...mdxSource} components={MDXComponents} />
          </div>
        </section>

        <footer
          className={`${styles.footer} ${entered ? styles.entered : ''}`}
          ref={(el) => { sectionRefs.current['end'] = el; }}
          data-nav-id="end"
        >
          <div className={styles.endMarker}>
            <span className={styles.endSignal}>{tCommon('endTransmission')}</span>
          </div>
          <div className={styles.footerNav}>
            {prevPost ? (
              <Link
                href={`/${locale}/blog/${prevPost.slug}`}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/${locale}/blog/${prevPost.slug}`); }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevPost.title}</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/blog`}
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
                href={`/${locale}/blog/${nextPost.slug}`}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/${locale}/blog/${nextPost.slug}`); }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextPost.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/blog`}
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
  const slugs = getPostSlugs();
  const paths = locales.flatMap((locale) =>
    slugs.map((slug) => ({ params: { locale, slug } })),
  );
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const slug = params!.slug as string;
  try {
    const { meta, content, actualLocale, translationStatus } = getPostBySlugAndLocale(slug, locale);
    const mdxSource = await serialize(content);
    const allPosts = getAllPostsForLocale(locale);
    const messages = await loadMessages(locale);
    const availableContentLocales = getAvailablePostContentLocales(slug);
    const contentVariants = Object.fromEntries(
      await Promise.all(
        availableContentLocales.map(async (contentLocale) => {
          const variant = getPostBySlugAndContentLocale(slug, contentLocale);
          return [
            contentLocale,
            {
              meta: variant.meta,
              mdxSource: await serialize(variant.content),
            },
          ];
        }),
      ),
    ) as Partial<Record<BlogContentLocale, BlogVariantPayload>>;

    return {
      props: {
        locale,
        messages,
        meta,
        mdxSource,
        allPosts,
        translationStatus,
        actualLocale,
        availableContentLocales,
        contentVariants,
      },
    };
  } catch {
    return { notFound: true };
  }
};
