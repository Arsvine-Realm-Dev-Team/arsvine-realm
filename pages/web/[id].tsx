import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import gsap from 'gsap';
import type { GetStaticPaths, GetStaticProps } from 'next';
import styles from '../../styles/Minecraft.module.scss';
import hudStyles from '../../styles/Home.module.scss';
import { useApp } from '../../contexts/AppContext';
import { useTransition } from '../../contexts/TransitionContext';
import LazyImage from '../../components/shared/LazyImage';
import Lightbox from '../../components/interactive/Lightbox';
import { webProjects, copyableTokens } from '../../data/projects';
import type { Project } from '../../types';

// 转义正则元字符，让 data/projects.ts 里的 pattern 字符串可以安全地按字面量匹配
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function useScrollReveal(rootRef: React.RefObject<HTMLElement | null>) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-reveal-idx'));
            if (!isNaN(idx)) {
              setVisible((prev) => new Set(prev).add(idx));
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px', root: rootRef.current }
    );
    refs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ready, rootRef]);

  const setRef = useCallback((idx: number) => (el: HTMLElement | null) => {
    refs.current[idx] = el;
  }, []);

  return { visible, setRef };
}

function useTypingSubtitle(text: string, speed = 100, delay = 1200) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started || displayed.length >= text.length) return;
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  return { displayed, done: displayed.length >= text.length };
}

interface PageProps { project: Project; }

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = webProjects.map((p) => ({ params: { id: String(p.id) } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const project = webProjects.find((p) => String(p.id) === params?.id);
  if (!project) return { notFound: true };
  return { props: { project } };
};

export default function WebDetailPage({ project }: PageProps) {
  return <WebDetailContent key={project.id} project={project} />;
}

function WebDetailContent({ project }: PageProps) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();

  const currentIndex = webProjects.findIndex((p) => p.id === project.id);
  const prevProject = currentIndex > 0 ? webProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < webProjects.length - 1 ? webProjects[currentIndex + 1] : null;

  const subtitle = useTypingSubtitle(project.description, 120, 2200);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { visible, setRef } = useScrollReveal(wrapperRef);
  const heroRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const paragraphs = project.articleContent
    ? project.articleContent.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    : [];

  const galleryImages = project.galleryImages || [];
  const highlights = project.highlights || [];

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const renderParagraph = useCallback((text: string, paraIndex: number) => {
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    // [1]/[2]/[3] 始终是 Markdown 链接 [text](url) 捕获组；从 [4] 起，每个
    // copyableTokens 条目对应一个独立的字面量捕获组。索引偏移由 tokenGroupBase 控制。
    const tokenGroupBase = 4;
    const tokenAlternation = copyableTokens
      .map((t) => `(${escapeRegExp(t.pattern)})`)
      .join('|');
    const regex = new RegExp(
      tokenAlternation
        ? `(\\[([^\\]]+)\\]\\(([^)]+)\\))|${tokenAlternation}`
        : `(\\[([^\\]]+)\\]\\(([^)]+)\\))`,
      'g'
    );
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) parts.push(text.substring(lastIdx, match.index));

      if (match[1]) {
        const linkText = match[2];
        const linkUrl = match[3];
        const isBilibili = linkUrl.includes('bilibili.com');
        const isGithub = linkUrl.includes('github.com');

        if (isBilibili || isGithub) {
          parts.push(
            <span key={match.index} className={styles.iconLinkContainer}>
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineIconLink}>
                <span className={styles.inlineIconSvgContainer}>
                  {isBilibili ? (
                    <svg className={styles.linkIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"/></svg>
                  ) : (
                    <svg className={styles.linkIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor"/></svg>
                  )}
                </span>
                <span className={styles.inlineIconText}>{linkText}</span>
                <div className={styles.iconRipple} />
              </a>
            </span>
          );
        } else {
          parts.push(<a key={match.index} href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>{linkText}</a>);
        }
      } else {
        // 检查是否命中了某个 copyableTokens 条目
        for (let i = 0; i < copyableTokens.length; i++) {
          const captured = match[tokenGroupBase + i];
          if (captured) {
            const token = copyableTokens[i];
            const id = `copy-${i}-${paraIndex}`;
            parts.push(
              <span key={match.index} className={styles.copyableTextContainer}>
                <button
                  onClick={() => handleCopy(captured, id)}
                  className={styles.copyableTextButton}
                  title={token.label}
                >
                  {captured}
                </button>
                {copiedId === id && <span className={styles.copyFeedback}>Copied!</span>}
              </span>
            );
            break;
          }
        }
      }

      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) parts.push(text.substring(lastIdx));
    return <>{parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)}</>;
  }, [copiedId, handleCopy]);

  const signalLinks = useMemo(() => {
    const links: { href: string; text: string; sub: string; type: string }[] = [];
    if (project.liveUrl) links.push({ href: project.liveUrl, text: 'Visit', sub: new URL(project.liveUrl).hostname, type: 'external' });
    if (project.githubUrl) links.push({ href: project.githubUrl, text: 'Source Code', sub: 'GITHUB', type: 'github' });
    if (project.videoUrl) {
      const urls = Array.isArray(project.videoUrl) ? project.videoUrl : [project.videoUrl];
      urls.forEach((url, i) => {
        const bvMatch = url.match(/BV[\w]+/);
        const sub = bvMatch ? bvMatch[0] : 'VIDEO';
        links.push({ href: url, text: urls.length > 1 ? `Watch ${i + 1}` : 'Watch', sub, type: 'video' });
      });
    }
    return links;
  }, [project.liveUrl, project.githubUrl, project.videoUrl]);

  // Parallax
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bg = heroBgRef.current;
    if (!wrapper || !bg) return;
    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { bg.style.transform = `translateY(${wrapper.scrollTop * 0.35}px)`; });
    };
    const timer = setTimeout(() => { wrapper.addEventListener('scroll', onScroll, { passive: true }); }, 100);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); wrapper.removeEventListener('scroll', onScroll); };
  }, []);

  // GSAP title reveal
  useEffect(() => {
    if (!titleRef.current) return;
    const timer = setTimeout(() => {
      if (!titleRef.current) return;
      const wrappers = titleRef.current.querySelectorAll(`.${styles.charWrapper}`);
      const inners = titleRef.current.querySelectorAll(`.${styles.charInner}`);
      wrappers.forEach((wrapper, i) => {
        const inner = inners[i];
        gsap.set(wrapper, { overflow: 'hidden', display: 'inline-block', position: 'relative', verticalAlign: 'top' });
        gsap.set(inner, { y: '110%', opacity: 0, display: 'inline-block' });
        gsap.to(inner, { y: '0%', opacity: 1, duration: 0.6, delay: 0.6 + i * 0.08, ease: 'power3.out' });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo('/content#works');
  }, [navigateTo]);

  // Right nav
  const [activeNav, setActiveNav] = useState('hero');
  const [isPastHero, setIsPastHero] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const navObserver = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { const id = entry.target.getAttribute('data-nav-id'); if (id) setActiveNav(id); } }); },
      { threshold: 0.3, root: wrapper }
    );
    const heroObserver = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.target.getAttribute('data-nav-id') === 'hero') setIsPastHero(!entry.isIntersecting); }); },
      { threshold: 0.55, root: wrapper }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) {
        navObserver.observe(el);
        if (el.getAttribute('data-nav-id') === 'hero') heroObserver.observe(el);
      }
    });
    return () => { navObserver.disconnect(); heroObserver.disconnect(); };
  }, [paragraphs.length, galleryImages.length, signalLinks.length]);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navItems = useMemo(() => {
    const items: { id: string; label: string }[] = [{ id: 'hero', label: 'Top' }];
    if (project.role || project.tech.length > 0 || highlights.length > 0) items.push({ id: 'meta', label: 'Meta' });
    if (paragraphs.length > 0) items.push({ id: 'brief', label: 'Brief' });
    if (galleryImages.length > 0) items.push({ id: 'archive', label: 'Archive' });
    if (signalLinks.length > 0) items.push({ id: 'signal', label: 'Signal' });
    return items;
  }, [project.role, project.tech.length, highlights.length, paragraphs.length, galleryImages.length, signalLinks.length]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxRect, setLightboxRect] = useState<DOMRect | null>(null);
  const thumbRefs = useRef<Record<string, HTMLElement | null>>({});

  const openLightbox = (idx: number, e: React.MouseEvent) => {
    setLightboxRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const nextImage = () => { setLightboxIdx((p) => (p + 1) % galleryImages.length); setLightboxRect(null); };
  const prevImage = () => { setLightboxIdx((p) => (p - 1 + galleryImages.length) % galleryImages.length); setLightboxRect(null); };
  const getClosingRect = () => {
    const thumb = thumbRefs.current[`gallery_${lightboxIdx}`];
    return thumb ? thumb.getBoundingClientRect() : null;
  };

  const showHero = !project.noHero && !project.isConfidential && !!project.imageUrl;
  const baseCover = project.imageUrl.split('?')[0];
  const invertedCover = project.invertedImageUrl?.split('?')[0];
  const coverImg = isInverted && invertedCover ? invertedCover : baseCover;
  let revealIdx = 0;

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${project.title.toUpperCase()} // WORKS`}</title>
        <meta name="description" content={project.title} />
        <meta property="og:type" content="article" />
        {showHero && coverImg && <link rel="preload" as="image" href={coverImg} />}
      </Head>

      <div className={styles.mainContent}>

        {showHero ? (
          <section className={styles.hero} ref={(el) => { heroRef.current = el; sectionRefs.current['hero'] = el; }} data-nav-id="hero">
            <div ref={heroBgRef} className={styles.heroBg} style={coverImg ? { backgroundImage: `url(${coverImg})` } : undefined} />
            <div className={styles.heroScanlines} />
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <h1 ref={titleRef} className={styles.heroTitle}>
                {project.title.toUpperCase().split('').map((char, i) => (
                  <span key={`t-${i}`} className={styles.charWrapper}>
                    <span className={styles.charInner}>{char === ' ' ? '\u00A0' : char}</span>
                  </span>
                ))}
              </h1>
              <p className={styles.heroSubtitle}>
                {subtitle.displayed}
                {!subtitle.done && <span className={styles.heroCursor} />}
              </p>
            </div>
          </section>
        ) : (
          <section className={styles.compactHeader} ref={(el) => { heroRef.current = el; sectionRefs.current['hero'] = el; }} data-nav-id="hero">
            <h1 ref={titleRef} className={styles.compactTitle}>
              {project.title.toUpperCase().split('').map((char, i) => (
                <span key={`t-${i}`} className={styles.charWrapper}>
                  <span className={styles.charInner}>{char === ' ' ? '\u00A0' : char}</span>
                </span>
              ))}
            </h1>
            <p className={styles.heroSubtitle}>
              {subtitle.displayed}
              {!subtitle.done && <span className={styles.heroCursor} />}
            </p>
          </section>
        )}

        {/* ===== PROJECT META ===== */}
        {(project.role || project.tech.length > 0 || highlights.length > 0) && (
          <section className={styles.metaSection} ref={(el) => { sectionRefs.current['meta'] = el; }} data-nav-id="meta">
            <h2 className={styles.sectionHeader}>{'// PROJECT_META'}</h2>
            <div className={styles.metaGrid}>
              {project.year && (
                <div className={styles.metaBlock}>
                  <span className={styles.metaLabel}>YEAR</span>
                  <span className={styles.metaValue}>{project.year}</span>
                </div>
              )}
              {project.role && (
                <div className={styles.metaBlock}>
                  <span className={styles.metaLabel}>ROLE</span>
                  <span className={styles.metaValue}>{project.role}</span>
                </div>
              )}
              {project.status && (
                <div className={styles.metaBlock}>
                  <span className={styles.metaLabel}>STATUS</span>
                  <span className={`${styles.metaValue} ${styles.statusBadge}`}>{project.status.toUpperCase()}</span>
                </div>
              )}
            </div>

            {project.tech.length > 0 && (
              <div className={styles.techRow}>
                {project.tech.map((tag) => (
                  <span key={tag} className={styles.techPill}>{tag}</span>
                ))}
              </div>
            )}

            {highlights.length > 0 && (
              <div className={styles.highlightBlock}>
                <span className={styles.metaLabel}>KEY HIGHLIGHTS</span>
                <ul className={styles.highlightList}>
                  {highlights.map((h, i) => {
                    const currentRevealIdx = revealIdx++;
                    return (
                      <li
                        key={i}
                        className={`${styles.highlightItem} ${visible.has(currentRevealIdx) ? styles.visible : ''}`}
                        data-reveal-idx={currentRevealIdx}
                        ref={setRef(currentRevealIdx)}
                      >
                        <span className={styles.highlightMarker}>›</span>
                        {h}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ===== PROJECT BRIEF ===== */}
        {paragraphs.length > 0 && (
          <section className={styles.timelineSection} ref={(el) => { sectionRefs.current['brief'] = el; }} data-nav-id="brief">
            <h2 className={styles.sectionHeader}>{'// PROJECT_BRIEF'}</h2>
            {paragraphs.map((para, i) => {
              const currentRevealIdx = revealIdx++;
              return (
                <div
                  key={i}
                  className={`${styles.timelineTextOnly} ${visible.has(currentRevealIdx) ? styles.visible : ''}`}
                  data-reveal-idx={currentRevealIdx}
                  ref={setRef(currentRevealIdx)}
                >
                  <p className={styles.timelineText}>{renderParagraph(para, i)}</p>
                </div>
              );
            })}
          </section>
        )}

        {/* ===== ARCHIVE ===== */}
        {galleryImages.length > 0 && (
          <section className={styles.webGallerySection} ref={(el) => { sectionRefs.current['archive'] = el; }} data-nav-id="archive">
            <div className={styles.webGalleryStack}>
              {(() => {
                const elements: React.ReactNode[] = [];
                let i = 0;
                while (i < galleryImages.length) {
                  const img = galleryImages[i];
                  const imgSrc = isInverted && img.invertedSrc ? img.invertedSrc : img.src;
                  const idx = i;

                  if (img.isMobile && i + 1 < galleryImages.length && galleryImages[i + 1].isMobile) {
                    const nextIdx = i + 1;
                    const nextImg = galleryImages[nextIdx];
                    const nextSrc = isInverted && nextImg.invertedSrc ? nextImg.invertedSrc : nextImg.src;
                    const revA = revealIdx++;
                    const revB = revealIdx++;
                    elements.push(
                      <div key={`mobile-pair-${idx}`} className={styles.mobilePairRow} style={{
                        opacity: visible.has(revA) ? 1 : 0,
                        transform: visible.has(revA) ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 0.8s ease-out, transform 0.8s ease-out'
                      }}>
                        <div
                          className={styles.mobileGalleryItem}
                          onClick={(e) => openLightbox(idx, e)}
                          ref={(el) => { thumbRefs.current[`gallery_${idx}`] = el; setRef(revA)(el); }}
                          data-reveal-idx={revA}
                        >
                          <LazyImage src={imgSrc} alt={img.caption || `${project.title} mobile ${idx + 1}`} quality="high" />
                        </div>
                        <div
                          className={styles.mobileGalleryItem}
                          onClick={(e) => openLightbox(nextIdx, e)}
                          ref={(el) => { thumbRefs.current[`gallery_${nextIdx}`] = el; setRef(revB)(el); }}
                          data-reveal-idx={revB}
                        >
                          <LazyImage src={nextSrc} alt={nextImg.caption || `${project.title} mobile ${nextIdx + 1}`} quality="high" />
                        </div>
                      </div>
                    );
                    i += 2;
                  } else {
                    const currentRevealIdx = revealIdx++;
                    elements.push(
                      <div
                        key={`gallery-${idx}`}
                        className={`${styles.webGalleryItem} ${visible.has(currentRevealIdx) ? styles.visible : ''}`}
                        onClick={(e) => openLightbox(idx, e)}
                        ref={(el) => { thumbRefs.current[`gallery_${idx}`] = el; setRef(currentRevealIdx)(el); }}
                        data-reveal-idx={currentRevealIdx}
                        style={{
                          opacity: visible.has(currentRevealIdx) ? 1 : 0,
                          transform: visible.has(currentRevealIdx) ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out'
                        }}
                      >
                        <LazyImage src={imgSrc} alt={img.caption || `${project.title} gallery ${idx + 1}`} quality="high" />
                      </div>
                    );
                    i++;
                  }
                }
                return elements;
              })()}
            </div>
          </section>
        )}

        {/* ===== SIGNAL OUTPUT ===== */}
        {signalLinks.length > 0 && (
          <section className={styles.linksSection} ref={(el) => { sectionRefs.current['signal'] = el; }} data-nav-id="signal">
            <h2 className={styles.sectionHeader}>{'// SIGNAL_OUTPUT'}</h2>
            <div className={styles.linksGrid}>
              {signalLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                  <div className={styles.linkIconWrap}>
                    {link.type === 'github' ? (
                      <svg className={styles.linkIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor" />
                      </svg>
                    ) : link.type === 'video' ? (
                      <svg className={styles.linkIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" />
                      </svg>
                    ) : (
                      <svg className={styles.linkIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V11H19V6.413L11.2071 14.2071L9.79289 12.7929L17.585 5H13V3H21Z" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{link.text}</span>
                    <span className={styles.linkSub}>{link.sub}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ===== FOOTER ===== */}
        <footer className={styles.footer}>
          {prevProject ? (
            <Link
              href={`/web/${prevProject.id}`}
              className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
              onClick={(e) => { e.preventDefault(); navigateTo(`/web/${prevProject.id}`); }}
              data-cursor-label="PREVIOUS"
            >
              <span className={styles.footerNavArrow}>←</span>
              <span className={styles.footerNavTitle}>{prevProject.title}</span>
            </Link>
          ) : (
            <Link
              href="/content#works"
              className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
              onClick={handleBack}
              data-cursor-label="BACK"
            >
              <span className={styles.footerNavArrow}>←</span>
              <span className={styles.footerNavTitle}>RETURN TO MAIN</span>
            </Link>
          )}
          {nextProject ? (
            <Link
              href={`/web/${nextProject.id}`}
              className={`${styles.footerNavButton} ${styles.footerNavNext}`}
              onClick={(e) => { e.preventDefault(); navigateTo(`/web/${nextProject.id}`); }}
              data-cursor-label="NEXT"
            >
              <span className={styles.footerNavTitle}>{nextProject.title}</span>
              <span className={styles.footerNavArrow}>→</span>
            </Link>
          ) : (
            <Link
              href="/content#works"
              className={`${styles.footerNavButton} ${styles.footerNavNext}`}
              onClick={handleBack}
              data-cursor-label="BACK"
            >
              <span className={styles.footerNavTitle}>RETURN TO MAIN</span>
              <span className={styles.footerNavArrow}>→</span>
            </Link>
          )}
        </footer>
      </div>

      {/* ===== RIGHT NAV ===== */}
      <nav className={`${styles.rightNav} ${isPastHero ? styles.visible : ''}`}>
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

      {lightboxOpen && galleryImages.length > 0 && (() => {
        const lbImg = galleryImages[lightboxIdx];
        const effectiveImg = isInverted && lbImg.invertedSrc ? { ...lbImg, src: lbImg.invertedSrc } : lbImg;
        return (
          <Lightbox
            image={effectiveImg}
            onClose={closeLightbox}
            onPrev={galleryImages.length > 1 ? prevImage : null}
            onNext={galleryImages.length > 1 ? nextImage : null}
            thumbnailRect={lightboxRect}
            currentIndex={lightboxIdx}
            totalImages={galleryImages.length}
            getClosingRectForIndex={getClosingRect}
          />
        );
      })()}
    </div>
  );
}
