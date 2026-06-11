import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { AnimatedTitleChars } from '../../components/shared/AnimatedTitleChars';
import { gameData, travelData, otherData } from '../../data/life';
import type { LifeItem } from '../../types';

const ALL_ITEMS: LifeItem[] = [...gameData, ...travelData, ...otherData];

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

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

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
    if (!started) return;
    if (displayed.length >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  return { displayed, done: displayed.length >= text.length };
}

interface PageProps {
  item: LifeItem;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = ALL_ITEMS.map((item) => ({ params: { slug: item.id } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const item = ALL_ITEMS.find((i) => i.id === params?.slug);
  if (!item) return { notFound: true };
  return { props: { item } };
};

export default function LifeDetailPage({ item }: PageProps) {
  return <LifeDetailContent key={item.id} item={item} />;
}

function LifeDetailContent({ item }: PageProps) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();

  const currentIndex = ALL_ITEMS.findIndex((i) => i.id === item.id);
  const prevItem = currentIndex > 0 ? ALL_ITEMS[currentIndex - 1] : null;
  const nextItem = currentIndex < ALL_ITEMS.length - 1 ? ALL_ITEMS[currentIndex + 1] : null;

  const subtitle = useTypingSubtitle(item.description, 120, 2200);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { visible, setRef } = useScrollReveal(wrapperRef);
  const heroRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const paragraphs = item.articleContent
    ? item.articleContent.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    : [];

  const galleryImages = item.galleryImages || [];
  const links = item.links || [];

  // Parallax scroll (deferred to avoid blocking initial render)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bg = heroBgRef.current;
    if (!wrapper || !bg) return;
    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        bg.style.transform = `translateY(${wrapper.scrollTop * 0.35}px)`;
      });
    };
    const timer = setTimeout(() => {
      wrapper.addEventListener('scroll', onScroll, { passive: true });
    }, 100);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      wrapper.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Character reveal animation (deferred)
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
        gsap.to(inner, {
          y: '0%',
          opacity: 1,
          duration: 0.6,
          delay: 0.6 + i * 0.08,
          ease: 'power3.out',
        });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Exit via global transition
  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo('/content#life');
  }, [navigateTo]);

  // Active section tracking for right nav
  const [activeNav, setActiveNav] = useState('hero');
  const [isPastHero, setIsPastHero] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Observer for Active Nav
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

    // Observer strictly for Hero visibility
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.getAttribute('data-nav-id') === 'hero') {
            setIsPastHero(!entry.isIntersecting);
          }
        });
      },
      { threshold: 0.55, root: wrapper }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) {
        navObserver.observe(el);
        if (el.getAttribute('data-nav-id') === 'hero') {
          heroObserver.observe(el);
        }
      }
    });

    return () => {
      navObserver.disconnect();
      heroObserver.disconnect();
    };
  }, [paragraphs.length, galleryImages.length, links.length]);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    items.push({ id: 'hero', label: 'Top' });
    if (paragraphs.length > 0) items.push({ id: 'story', label: 'Story' });
    if (galleryImages.length > 0) items.push({ id: 'archive', label: 'Archive' });
    if (links.length > 0) items.push({ id: 'links', label: 'Signal' });
    return items;
  }, [paragraphs.length, galleryImages.length, links.length]);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxRect, setLightboxRect] = useState<DOMRect | null>(null);
  const thumbRefs = useRef<Record<string, HTMLElement | null>>({});

  const openLightbox = (idx: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setLightboxRect(rect);
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const nextImage = () => { setLightboxIdx((prev) => (prev + 1) % galleryImages.length); setLightboxRect(null); };
  const prevImage = () => { setLightboxIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length); setLightboxRect(null); };
  const getClosingRect = () => {
    const thumb = thumbRefs.current[`gallery_${lightboxIdx}`];
    return thumb ? thumb.getBoundingClientRect() : null;
  };

  // Strip query params from imageUrl for high-quality hero background
  const coverImg = item.imageUrl.split('?')[0];

  let revealIdx = 0;

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${item.title.toUpperCase()} // LIFE`}</title>
        <meta name="description" content={item.title} />
        <meta property="og:type" content="article" />
        <link rel="preload" as="image" href={coverImg} />
      </Head>

      <div className={styles.mainContent}>

          {/* ===== HERO ===== */}
          <section className={styles.hero} ref={(el) => { heroRef.current = el; sectionRefs.current['hero'] = el; }} data-nav-id="hero">
            <div
              ref={heroBgRef}
              className={styles.heroBg}
              style={{ backgroundImage: `url(${coverImg})` }}
            />
            <div className={styles.heroScanlines} />
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <h1 ref={titleRef} className={styles.heroTitle}>
                <AnimatedTitleChars
                  text={item.title}
                  wrapperClassName={styles.charWrapper}
                  innerClassName={styles.charInner}
                />
              </h1>
              <p className={styles.heroSubtitle}>
                {subtitle.displayed}
                {!subtitle.done && <span className={styles.heroCursor} />}
              </p>
            </div>
          </section>

          {/* ===== STORY ===== */}
          {paragraphs.length > 0 && (
            <section className={styles.timelineSection} ref={(el) => { sectionRefs.current['story'] = el; }} data-nav-id="story">
              <h2 className={styles.sectionHeader}>{'// STORY_LOG'}</h2>
              {paragraphs.map((para, i) => {
                const currentRevealIdx = revealIdx++;
                return (
                  <div
                    key={i}
                    className={`${styles.timelineTextOnly} ${visible.has(currentRevealIdx) ? styles.visible : ''}`}
                    data-reveal-idx={currentRevealIdx}
                    ref={setRef(currentRevealIdx)}
                  >
                    <p className={styles.timelineText}>{para}</p>
                  </div>
                );
              })}
            </section>
          )}

          {/* ===== GALLERY ===== */}
          {galleryImages.length > 0 && (
            <section className={styles.gallerySection} ref={(el) => { sectionRefs.current['archive'] = el; }} data-nav-id="archive">
              <h2 className={styles.sectionHeader}>{'// ARCHIVE'}</h2>
              <div className={styles.galleryGrid}>
                {galleryImages.map((img, idx) => {
                  const currentRevealIdx = revealIdx++;
                  return (
                    <div
                      key={idx}
                      className={styles.galleryItem}
                      onClick={(e) => openLightbox(idx, e)}
                      ref={(el) => { thumbRefs.current[`gallery_${idx}`] = el; }}
                      data-reveal-idx={currentRevealIdx}
                    >
                      <LazyImage
                        src={img.src}
                        alt={img.caption || `${item.title} gallery ${idx + 1}`}
                        quality="medium"
                      />
                      <div className={styles.galleryOverlay} />
                      <div className={styles.galleryCornerTL} />
                      <div className={styles.galleryCornerBR} />
                      {img.caption && (
                        <div className={styles.galleryCaption}>{img.caption}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== LINKS ===== */}
          {links.length > 0 && (
            <section className={styles.linksSection} ref={(el) => { sectionRefs.current['links'] = el; }} data-nav-id="links">
              <h2 className={styles.sectionHeader}>{'// SIGNAL_OUTPUT'}</h2>
              <div className={styles.linksGrid}>
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkCard}
                  >
                    <div className={styles.linkIconWrap}>
                      <svg className={styles.linkIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <g><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"/></g>
                      </svg>
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
            {prevItem ? (
              <Link
                href={`/life/${prevItem.id}`}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/life/${prevItem.id}`); }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevItem.title}</span>
              </Link>
            ) : (
              <Link
                href="/content#life"
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>RETURN TO MAIN</span>
              </Link>
            )}
            {nextItem ? (
              <Link
                href={`/life/${nextItem.id}`}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/life/${nextItem.id}`); }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextItem.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href="/content#life"
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

      {lightboxOpen && galleryImages.length > 0 && (
        <Lightbox
          image={galleryImages[lightboxIdx]}
          onClose={closeLightbox}
          onPrev={galleryImages.length > 1 ? prevImage : null}
          onNext={galleryImages.length > 1 ? nextImage : null}
          thumbnailRect={lightboxRect}
          currentIndex={lightboxIdx}
          totalImages={galleryImages.length}
          getClosingRectForIndex={getClosingRect}
        />
      )}
    </div>
  );
}
