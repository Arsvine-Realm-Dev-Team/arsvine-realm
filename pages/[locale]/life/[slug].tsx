import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import gsap from 'gsap';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import styles from '../../../styles/Minecraft.module.scss';
import hudStyles from '../../../styles/Home.module.scss';
import { useApp } from '../../../contexts/AppContext';
import { useTransition } from '../../../contexts/TransitionContext';
import LazyImage from '../../../components/shared/LazyImage';
import Lightbox from '../../../components/interactive/Lightbox';
import { AnimatedTitleChars } from '../../../components/shared/AnimatedTitleChars';
import HreflangLinks from '../../../components/shared/HreflangLinks';
import LocaleFallbackBanner from '../../../components/shared/LocaleFallbackBanner';
import { loadLife, loadMessages, resolveLifeItem } from '../../../lib/i18n-data';
import { defaultLocale, locales, type Locale } from '../../../i18n/config';
import type { LifeItem, TranslationStatus } from '../../../types';

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
  locale: Locale;
  messages: Record<string, unknown>;
  item: LifeItem;
  allItems: LifeItem[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
}

export const getStaticPaths: GetStaticPaths = async () => {
  // 用 defaultLocale 的 id 集合在所有 locale 下展开 paths，
  // 未译条目也能渲染（带 fallback banner），不再 404。
  const baseLife = loadLife(defaultLocale);
  const baseIds = [...baseLife.gameData, ...baseLife.travelData, ...baseLife.otherData].map((i) => i.id);
  const paths = locales.flatMap((locale) =>
    baseIds.map((id) => ({ params: { locale, slug: id } })),
  );
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  const resolved = resolveLifeItem(params!.slug as string, locale);
  if (!resolved) return { notFound: true };
  // 列表 prev/next 仍按当前 locale 自有数据
  const life = loadLife(locale);
  const allItems = [...life.gameData, ...life.travelData, ...life.otherData];
  return {
    props: {
      locale,
      messages,
      item: resolved.item,
      allItems,
      translationStatus: resolved.status,
      actualLocale: resolved.actualLocale,
      originLocale: resolved.originLocale,
    },
  };
};

export default function LifeDetailPage({ locale, item, allItems, translationStatus, actualLocale, originLocale }: PageProps) {
  return <LifeDetailContent key={`${locale}-${item.id}`} locale={locale} item={item} allItems={allItems} translationStatus={translationStatus} actualLocale={actualLocale} originLocale={originLocale} />;
}

function LifeDetailContent({ locale, item, allItems, translationStatus, actualLocale, originLocale }: Omit<PageProps, 'messages'>) {
  const { isInverted } = useApp();
  const { navigateTo } = useTransition();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tDetail = useTranslations('detail');

  const currentIndex = allItems.findIndex((i) => i.id === item.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

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

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo(`/${locale}/content#life`);
  }, [navigateTo, locale]);

  const [activeNav, setActiveNav] = useState('hero');
  const [isPastHero, setIsPastHero] = useState(false);
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
    items.push({ id: 'hero', label: tNav('top') });
    if (paragraphs.length > 0) items.push({ id: 'story', label: tNav('story') });
    if (galleryImages.length > 0) items.push({ id: 'archive', label: tNav('archive') });
    if (links.length > 0) items.push({ id: 'links', label: tNav('signal') });
    return items;
  }, [galleryImages.length, links.length, paragraphs.length, tNav]);

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

  const coverImg = item.imageUrl.split('?')[0];

  let revealIdx = 0;

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${item.title.toUpperCase()} // LIFE`}</title>
        <meta name="description" content={item.title} />
        <meta property="og:type" content="article" />
        <link rel="preload" as="image" href={coverImg} />
        <HreflangLinks basePath={`/life/${item.id}`} />
      </Head>

      <div className={styles.mainContent}>
          {translationStatus !== 'source' && (
            <LocaleFallbackBanner requestedLocale={locale} actualLocale={actualLocale} originLocale={originLocale} status={translationStatus} />
          )}

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

          {paragraphs.length > 0 && (
            <section className={styles.timelineSection} ref={(el) => { sectionRefs.current['story'] = el; }} data-nav-id="story">
              <h2 className={styles.sectionHeader}>{tDetail('storyLog')}</h2>
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

          {galleryImages.length > 0 && (
            <section className={styles.gallerySection} ref={(el) => { sectionRefs.current['archive'] = el; }} data-nav-id="archive">
              <h2 className={styles.sectionHeader}>{tDetail('archive')}</h2>
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

          {links.length > 0 && (
            <section className={styles.linksSection} ref={(el) => { sectionRefs.current['links'] = el; }} data-nav-id="links">
              <h2 className={styles.sectionHeader}>{tDetail('signalOutput')}</h2>
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

          <footer className={styles.footer}>
            {prevItem ? (
              <Link
                href={`/${locale}/life/${prevItem.id}`}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/${locale}/life/${prevItem.id}`); }}
                data-cursor-label="PREVIOUS"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{prevItem.title}</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/content#life`}
                className={`${styles.footerNavButton} ${styles.footerNavPrev}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavArrow}>←</span>
                <span className={styles.footerNavTitle}>{tCommon('returnToMain')}</span>
              </Link>
            )}
            {nextItem ? (
              <Link
                href={`/${locale}/life/${nextItem.id}`}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/${locale}/life/${nextItem.id}`); }}
                data-cursor-label="NEXT"
              >
                <span className={styles.footerNavTitle}>{nextItem.title}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/content#life`}
                className={`${styles.footerNavButton} ${styles.footerNavNext}`}
                onClick={handleBack}
                data-cursor-label="BACK"
              >
                <span className={styles.footerNavTitle}>{tCommon('returnToMain')}</span>
                <span className={styles.footerNavArrow}>→</span>
              </Link>
            )}
          </footer>
        </div>

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
