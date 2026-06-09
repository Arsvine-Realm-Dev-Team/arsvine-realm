import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import gsap from 'gsap';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import MDXComponents from '../../components/mdx/MDXComponents';
import { getPostBySlug, getPostSlugs, getAllPosts } from '../../lib/blog';
import type { BlogPostMeta } from '../../types';
import styles from '../../styles/BlogDetailView.module.scss';
import hudStyles from '../../styles/Home.module.scss';
import { useApp } from '../../contexts/AppContext';
import { useTransition } from '../../contexts/TransitionContext';

interface BlogPostPageProps {
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
  allPosts: BlogPostMeta[];
}

export default function BlogPostPage({ meta, mdxSource, allPosts }: BlogPostPageProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <BlogLoadingShell />;
  }

  return <BlogDetailContent key={meta.slug} meta={meta} mdxSource={mdxSource} allPosts={allPosts} />;
}

function BlogLoadingShell() {
  const { isInverted } = useApp();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head><title>LOADING</title></Head>
      <div className={styles.mainContent}>
        <header className={`${styles.headerSection} ${entered ? styles.entered : ''}`}>
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{'// SIGNAL_FRAGMENT'}</span>
          </div>
        </header>
        <section className={styles.contentSection}>
          <div className={styles.loadingIndicator}>
            <span className={styles.loadingText}>DECODING TRANSMISSION...</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function BlogDetailContent({ meta, mdxSource, allPosts }: BlogPostPageProps) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();

  const currentIndex = allPosts.findIndex((p) => p.slug === meta.slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [titleDone, setTitleDone] = useState(false);

  // Title character reveal animation
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

  // Trigger entry animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll-reveal for content blocks — gated by title animation
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
    navigateTo('/blog');
  }, [navigateTo]);

  // Right nav: active section tracking
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
    { id: 'header', label: 'Top' },
    { id: 'content', label: 'Content' },
    { id: 'end', label: 'End' },
  ], []);

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${meta.title} // Blog`}</title>
        <meta name="description" content={meta.excerpt} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'}/blog/${meta.slug}`} />
        <meta property="article:published_time" content={meta.date} />
        {meta.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Head>

      <div className={styles.mainContent}>

        {/* ===== HEADER ===== */}
        <header
          className={`${styles.headerSection} ${entered ? styles.entered : ''}`}
          ref={(el) => { sectionRefs.current['header'] = el; }}
          data-nav-id="header"
        >
          <div className={styles.headerContent}>
            <span className={styles.headerSignal}>{'// SIGNAL_FRAGMENT'}</span>
            <h1 ref={titleRef} className={styles.headerTitle}>
              {meta.title.split("").map((char, i) => (
                <span key={`t-${i}`} className={styles.charWrapper}>
                  <span className={styles.charInner}>{char === ' ' ? '\u00A0' : char}</span>
                </span>
              ))}
            </h1>
            <div className={styles.headerMeta}>
              {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
              {meta.readingTime && <span className={styles.headerReadingTime}>{meta.readingTime}</span>}
            </div>
            {meta.tags.length > 0 && (
              <div className={styles.headerTags}>
                {meta.tags.map((tag) => (
                  <span key={tag} className={styles.headerTag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        <section
          className={styles.contentSection}
          ref={(el) => { sectionRefs.current['content'] = el; }}
          data-nav-id="content"
        >
          <div className={`${styles.loadingIndicator} ${titleDone ? styles.hidden : ''}`}>
            <span className={styles.loadingText}>DECODING TRANSMISSION...</span>
          </div>
          <div ref={contentBodyRef} className={styles.contentBody}>
            <MDXRemote {...mdxSource} components={MDXComponents} />
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer
          className={`${styles.footer} ${entered ? styles.entered : ''}`}
          ref={(el) => { sectionRefs.current['end'] = el; }}
          data-nav-id="end"
        >
          <div className={styles.endMarker}>
            <span className={styles.endSignal}>— END TRANSMISSION —</span>
          </div>
          <div className={styles.footerNav}>
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/blog/${prevPost.slug}`); }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevPost.title}</span>
              </Link>
            ) : (
              <Link
                href="/blog"
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>RETURN TO INDEX</span>
              </Link>
            )}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/blog/${nextPost.slug}`); }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextPost.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href="/blog"
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavTitle}>RETURN TO INDEX</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            )}
          </div>
        </footer>
      </div>

      {/* ===== RIGHT NAV ===== */}
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
  const paths = slugs.map((slug) => ({ params: { slug } }));
  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  try {
    const { meta, content } = getPostBySlug(slug);
    const mdxSource = await serialize(content);
    const allPosts = getAllPosts();
    return { props: { meta, mdxSource, allPosts } };
  } catch {
    return { notFound: true };
  }
};
