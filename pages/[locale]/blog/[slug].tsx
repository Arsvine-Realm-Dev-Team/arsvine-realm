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
import { AnimatedTitleChars } from '../../../components/shared/AnimatedTitleChars';
import {
  getPostBySlugAndLocale,
  getPostMetaBySlugAndLocale,
  getAllPostsForLocale,
  getPostSlugs,
  getAvailablePostContentLocales,
  getBlogPostEntry,
  type BlogContentLocale,
} from '../../../lib/blog';
import { loadMessages } from '../../../lib/i18n-data';
import type { BlogPostMeta, TranslationStatus } from '../../../types';
import styles from '../../../styles/BlogDetailView.module.scss';
import hudStyles from '../../../styles/Home.module.scss';
import accessStyles from '../../../styles/PostAccessPage.module.scss';
import { useApp } from '../../../contexts/AppContext';
import { useTransition } from '../../../contexts/TransitionContext';
import { getSiteUrl } from '../../../data/site';
import { locales, defaultLocale, type Locale } from '../../../i18n/config';
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
  mdxSource: MDXRemoteSerializeResult | null;
  allPosts: BlogPostMeta[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: { mode: string; group?: string };
  isProtected: boolean;
}

function getRequestedContentLocaleFromPath(asPath: string): BlogContentLocale | null {
  const query = asPath.split('?')[1]?.split('#')[0];
  if (!query) return null;

  const lang = new URLSearchParams(query).get('lang');
  return lang && isBlogContentLocale(lang) ? lang : null;
}

function resolveDefaultContentLocale(
  pageLocale: Locale,
  availableLocales: BlogContentLocale[],
  fallbackLocale: BlogContentLocale,
): BlogContentLocale {
  if (availableLocales.includes(pageLocale)) {
    return pageLocale;
  }
  return fallbackLocale;
}

function buildProtectedPostApiPath(locale: BlogContentLocale, slug: string) {
  const search = new URLSearchParams({
    locale,
    slug,
  });
  return `/api/post-variant?${search.toString()}`;
}

function buildBlogPostHref(locale: Locale, slug: string, contentLocale: BlogContentLocale) {
  return `/${locale}/blog/${slug}?lang=${encodeURIComponent(contentLocale)}`;
}

function writeContentLocaleQuery(nextContentLocale: BlogContentLocale) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('lang', nextContentLocale);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
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
  const defaultContentLocale = useMemo(
    () => resolveDefaultContentLocale(locale, availableContentLocales, actualContentLocale),
    [actualContentLocale, availableContentLocales, locale],
  );
  const [requestedContentLocale, setRequestedContentLocale] = useState<BlogContentLocale>(
    () => getRequestedContentLocaleFromPath(router.asPath) ?? defaultContentLocale,
  );
  const initialContentLocale = actualContentLocale;
  const [authState, setAuthState] = useState<'checking' | 'required' | 'granted'>(
    !isProtected || access.mode === 'public' ? 'granted' : 'checking',
  );
  const [lazyVariants, setLazyVariants] = useState<Partial<Record<BlogContentLocale, BlogVariantPayload>>>({});
  const [loadingLang, setLoadingLang] = useState<BlogContentLocale | null>(null);
  const [selectedContentLocale, setSelectedContentLocale] = useState<BlogContentLocale>(initialContentLocale);
  const [loadError, setLoadError] = useState('');
  const allVariants = useMemo(
    () => ({ ...contentVariants, ...lazyVariants }),
    [contentVariants, lazyVariants],
  );
  const baseVariant = useMemo(
    () => (mdxSource ? { meta, mdxSource } : null),
    [mdxSource, meta],
  );
  const selectedVariant = allVariants[selectedContentLocale] ?? baseVariant;
  const suppressFallbackBanner =
    selectedContentLocale !== actualContentLocale || requestedContentLocale !== actualContentLocale;
  const effectiveStatus: TranslationStatus = suppressFallbackBanner
    ? 'source'
    : translationStatus;
  const effectiveOriginLocale: Locale = ((selectedVariant?.meta.originLocale)
    ?? meta.originLocale
    ?? actualLocale) as Locale;

  const updateContentLocaleQuery = useCallback((nextContentLocale: BlogContentLocale) => {
    if (typeof window === 'undefined') return;

    setRequestedContentLocale(nextContentLocale);
    writeContentLocaleQuery(nextContentLocale);
  }, []);

  const loadVariant = useCallback(async (nextContentLocale: BlogContentLocale) => {
    setLoadingLang(nextContentLocale);
    setLoadError('');

    try {
      const response = await fetch(buildProtectedPostApiPath(nextContentLocale, meta.slug));
      const data = (await response.json()) as BlogVariantPayload | { error?: string };

      if (!response.ok || !('meta' in data) || !('mdxSource' in data)) {
        if (response.status === 403) {
          setAuthState('required');
          return null;
        }
        throw new Error('failed_to_load_variant');
      }

      setLazyVariants((prev) => ({ ...prev, [nextContentLocale]: data }));
      return data;
    } catch {
      setLoadError('Unable to load article content.');
      return null;
    } finally {
      setLoadingLang((current) => (current === nextContentLocale ? null : current));
    }
  }, [meta.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- slug/asPath change must immediately resync the requested article-language query state
    setRequestedContentLocale(getRequestedContentLocaleFromPath(router.asPath) ?? defaultContentLocale);
    setLazyVariants({});
    setLoadingLang(null);
    setLoadError('');
    setSelectedContentLocale(initialContentLocale);
    setAuthState(!isProtected || access.mode === 'public' ? 'granted' : 'checking');
  }, [access.mode, defaultContentLocale, actualContentLocale, initialContentLocale, isProtected, meta.slug, router.asPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentLang = getRequestedContentLocaleFromPath(window.location.href);
    if (currentLang === requestedContentLocale) return;

    writeContentLocaleQuery(requestedContentLocale);
  }, [requestedContentLocale]);

  useEffect(() => {
    if (!isProtected || access.mode === 'public' || !access.group) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- public posts bypass the protected gate by definition
      setAuthState('granted');
      return;
    }

    let cancelled = false;
    fetch(`/api/grant-check?group=${encodeURIComponent(access.group)}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; granted: boolean }) => {
        if (cancelled) return;
        setAuthState(data.granted ? 'granted' : 'required');
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState('required');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [access.group, access.mode, isProtected]);

  useEffect(() => {
    if (authState !== 'granted') return;
    const targetContentLocale = requestedContentLocale;
    const hasBaseVariantForSelected = Boolean(
      baseVariant && selectedContentLocale === actualContentLocale,
    );

    if (targetContentLocale !== selectedContentLocale) {
      if (loadingLang === targetContentLocale) return;
      if (allVariants[targetContentLocale]) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- once the requested locale payload is already cached, switch the displayed locale immediately
        setSelectedContentLocale(targetContentLocale);
        return;
      }

      void loadVariant(targetContentLocale).then((payload) => {
        if (payload) {
          setSelectedContentLocale(targetContentLocale);
        }
      });
      return;
    }

    if (hasBaseVariantForSelected || allVariants[selectedContentLocale]) {
      return;
    }
    if (loadingLang === selectedContentLocale) return;

    void loadVariant(selectedContentLocale);
  }, [
    actualContentLocale,
    allVariants,
    authState,
    baseVariant,
    loadVariant,
    loadingLang,
    requestedContentLocale,
    selectedContentLocale,
  ]);

  if (router.isFallback || authState === 'checking') {
    return <BlogLoadingShell />;
  }

  if (authState === 'required' && access.mode === 'totp' && access.group) {
    return (
      <ProtectedPostGate
        locale={locale}
        meta={meta}
        group={access.group}
        onVerified={() => {
          setAuthState('granted');
        }}
      />
    );
  }

  if (!selectedVariant) {
    return <BlogLoadingShell />;
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
      selectedContentLocale={selectedContentLocale}
      setSelectedContentLocale={setSelectedContentLocale}
      availableContentLocales={availableContentLocales}
      loadingLang={loadingLang}
      actualContentLocale={actualContentLocale}
      defaultContentLocale={defaultContentLocale}
      updateContentLocaleQuery={updateContentLocaleQuery}
      loadError={loadError}
    />
  );
}

function ProtectedPostGate({
  locale,
  meta,
  group,
  onVerified,
}: {
  locale: Locale;
  meta: BlogPostMeta;
  group: string;
  onVerified: () => void | Promise<void>;
}) {
  const { isInverted } = useApp();
  const t = useTranslations('pages.access');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedTokenRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const submitToken = useCallback(async (nextToken: string) => {
    if (submitting || nextToken.length !== 6 || lastSubmittedTokenRef.current === nextToken) {
      return;
    }

    lastSubmittedTokenRef.current = nextToken;
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/protected-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group,
          token: nextToken,
          next: buildBlogPostHref(locale, meta.slug, locale),
        }),
      });

      const json = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message || t('invalidToken'));
      }

      await onVerified();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : t('invalidToken'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [group, locale, meta.slug, onVerified, submitting, t]);

  const handleTokenChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextToken = event.target.value.replace(/\D+/g, '').slice(0, 6);
    lastSubmittedTokenRef.current = nextToken.length === 6 ? lastSubmittedTokenRef.current : null;
    setError('');
    setToken(nextToken);
    if (nextToken.length === 6) {
      void submitToken(nextToken);
    }
  }, [submitToken]);

  const handleFieldClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (token.length === 6) {
      void submitToken(token);
    }
  }, [submitToken, token]);

  return (
    <div className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${meta.title} // Blog`}</title>
        <meta name="description" content={meta.excerpt} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/blog/${meta.slug}`} />
        <HreflangLinks basePath={`/blog/${meta.slug}`} />
      </Head>

      <div className={styles.mainContent}>
        <header className={`${styles.headerSection} ${entered ? styles.entered : ''}`}>
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{t('heading')}</span>
            <h1 className={styles.headerTitle}>{meta.title}</h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              <span className={styles.headerReadingTime}>{t('description')}</span>
            </div>
          </div>
        </header>

        <section className={styles.contentSection}>
          <div className={`${accessStyles.page} ${accessStyles.embedded}`}>
            <form className={accessStyles.card} onSubmit={handleSubmit}>
              <label className={accessStyles.label} htmlFor="totp-token-inline">
                {t('tokenLabel')}
              </label>
              <div
                className={accessStyles.codeField}
                onClick={handleFieldClick}
                role="presentation"
              >
                <input
                  ref={inputRef}
                  id="totp-token-inline"
                  className={accessStyles.hiddenInput}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={token}
                  disabled={submitting}
                  onChange={handleTokenChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                <div className={accessStyles.slotGrid} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => {
                    const char = token[index] ?? '';
                    const isActive = isFocused && index === Math.min(token.length, 5) && token.length < 6;
                    const isFilled = char !== '';

                    return (
                      <span
                        key={index}
                        className={`${accessStyles.slot}${isFilled ? ` ${accessStyles.slotFilled}` : ''}${isActive ? ` ${accessStyles.slotActive}` : ''}`}
                      >
                        {char || '\u00A0'}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className={accessStyles.hint}>{t('hint')}</p>
              <p className={accessStyles.status} aria-live="polite">
                {submitting ? t('verifying') : '\u00A0'}
              </p>
              {error ? <p className={accessStyles.error}>{error}</p> : null}
              <button className={accessStyles.hiddenSubmit} type="submit" tabIndex={-1} aria-hidden="true" />
            </form>
          </div>
        </section>
      </div>
    </div>
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
  setSelectedContentLocale,
  availableContentLocales,
  loadingLang,
  actualContentLocale,
  defaultContentLocale,
  updateContentLocaleQuery,
  loadError,
}: Omit<BlogPostPageProps, 'messages' | 'contentVariants' | 'access' | 'isProtected' | 'actualContentLocale' | 'mdxSource'> & {
  mdxSource: MDXRemoteSerializeResult;
  selectedContentLocale: BlogContentLocale;
  setSelectedContentLocale: React.Dispatch<React.SetStateAction<BlogContentLocale>>;
  originLocale: Locale;
  loadingLang: BlogContentLocale | null;
  actualContentLocale: BlogContentLocale;
  defaultContentLocale: BlogContentLocale;
  updateContentLocaleQuery: (nextContentLocale: BlogContentLocale) => void;
  loadError: string;
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
  }, [meta.title, selectedContentLocale]);

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
    if (nextContentLocale === selectedContentLocale || loadingLang) return;
    if (nextContentLocale === actualContentLocale) {
      setSelectedContentLocale(nextContentLocale);
      updateContentLocaleQuery(nextContentLocale);
      return;
    }
    updateContentLocaleQuery(nextContentLocale);
  }, [
    actualContentLocale,
    loadingLang,
    selectedContentLocale,
    setSelectedContentLocale,
    updateContentLocaleQuery,
  ]);

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
            {loadError ? <p className={accessStyles.error}>{loadError}</p> : null}
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
          {(!titleDone || Boolean(loadingLang)) && (
            <div className={styles.loadingIndicator}>
              <span className={styles.loadingText}>{tCommon('decoding')}</span>
            </div>
          )}
          <div key={selectedContentLocale} ref={contentBodyRef} className={styles.contentBody}>
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
                href={buildBlogPostHref(locale, prevPost.slug, defaultContentLocale)}
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
          meta: metaResult.meta,
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

function normalizeAccess(access?: { mode: string; group?: string }): { mode: string; group?: string } {
  if (access?.mode === 'totp') {
    return { mode: 'totp', group: access.group?.trim() || undefined };
  }
  return { mode: 'public' };
}
