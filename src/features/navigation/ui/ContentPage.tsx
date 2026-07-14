'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from '../../../app/styles/Shell.module.scss';
import contentStyles from '../styles/ContentPage.module.scss';
import { useLayoutAnchors } from '../model/LayoutAnchorsContext';
import { useTransition } from '../model/TransitionProvider';

import WorksSection from '../../portfolio/ui/WorksSection';
import ExperienceSection from '../../experience/ui/ExperienceSection';
import BlogSection from '../../blog/ui/blog/BlogSection';
import LifeSection from '../../life/ui/LifeSection';
import ContactSection from '../../profile/ui/ContactSection';
import AboutSection from '../../profile/ui/AboutSection';

import WorkDetailView from '../../portfolio/ui/WorkDetailView';
import ExperienceDetailView from '../../experience/ui/ExperienceDetailView';
import LifeDetailView from '../../life/ui/LifeDetailView';

import { buildBlogPostHref } from '../../blog/model/blogClient';
import { resolveImageUrl } from '@/shared/lib/cdn';
import { setHudTypingOverlaySuppressed } from '@/shared/lib/hud-typing-visibility';
import { markCursorTargetsDirty } from '@/shared/lib/cursor-targets';
import { siteConfig } from '@/shared/config/site';
import type { Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta, Project, LifeItem, ExperienceItem, SkillCategory } from '../../../shared/types';
import { useNavigationRuntime } from '../model/NavigationRuntime';
import { CONTENT_DETAIL_EXIT_DELAY_MS } from '@/shared/lib/ui-timings';

type DetailMode =
  | { type: 'none' }
  | { type: 'work'; item: Project }
  | { type: 'experience'; item: ExperienceItem }
  | { type: 'life'; item: LifeItem };

export interface ContentPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  blogPosts: BlogPostMeta[];
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
  experienceData: ExperienceItem[];
  gameData: LifeItem[];
  travelData: LifeItem[];
  otherData: LifeItem[];
  alsoPlayGames: string[];
  artPlaceholderText: string;
  skillCategories: SkillCategory[];
  pageDescription: string;
}

export default function ContentPage({
  locale,
  blogPosts,
  webProjects,
  gameProjects,
  earlyProjects,
  experienceData,
  gameData,
  travelData,
  otherData,
  alsoPlayGames,
  artPlaceholderText,
  skillCategories,
  pageDescription,
}: ContentPageProps) {
  const { prefetch } = useNavigationRuntime();
  const { navigateTo, setBackOverride } = useTransition();
  const { registerScrollContainer } = useLayoutAnchors();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const blogSectionRef = useRef<HTMLDivElement>(null);
  const worksSectionRef = useRef<HTMLDivElement>(null);
  const workContentAreaRef = useRef<HTMLDivElement>(null);
  const webTabRef = useRef<HTMLDivElement>(null);
  const gameTabRef = useRef<HTMLDivElement>(null);
  const [activeWorkTab, setActiveWorkTab] = useState('web');

  const experienceSectionRef = useRef<HTMLDivElement>(null);

  const lifeSectionRef = useRef<HTMLDivElement>(null);
  const lifeContentAreaRef = useRef<HTMLDivElement>(null);
  const lifeGameTabRef = useRef<HTMLDivElement>(null);
  const lifeTravelTabRef = useRef<HTMLDivElement>(null);
  const lifeArtTabRef = useRef<HTMLDivElement>(null);
  const lifeOtherTabRef = useRef<HTMLDivElement>(null);
  const [activeLifeTab, setActiveLifeTab] = useState('game');

  const contactSectionRef = useRef<HTMLDivElement>(null);
  const [isEmailCopied, setIsEmailCopied] = useState(false);

  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const aboutContentRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<DetailMode>({ type: 'none' });
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const detailCloseTimeoutRef = useRef<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  const isDetailMounted = detail.type !== 'none';

  useEffect(() => {
    return () => {
      setBackOverride(null);
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
      }
    };
  }, [setBackOverride]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const prefetched = new Set<string>();
    const publicBlogPosts = blogPosts.filter((post) => post.access.mode === 'public');
    const immediateUrls = [
      ...webProjects.slice(0, 2).map((project) => `/${locale}/web/${project.id}`),
      ...publicBlogPosts.slice(0, 4).map((post) => buildBlogPostHref(locale, post.slug, locale)),
    ];
    const idleUrls = [
      ...gameData.slice(0, 2).map((item) => `/${locale}/life/${item.id}`),
      ...travelData.slice(0, 1).map((item) => `/${locale}/life/${item.id}`),
      ...otherData.slice(0, 1).map((item) => `/${locale}/life/${item.id}`),
      ...webProjects.slice(2).map((project) => `/${locale}/web/${project.id}`),
      ...publicBlogPosts.slice(4).map((post) => buildBlogPostHref(locale, post.slug, locale)),
    ];

    const prefetchUrl = (url: string) => {
      if (prefetched.has(url)) {
        return;
      }
      prefetched.add(url);
      void prefetch(url).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[content] prefetch failed:', url, error);
        }
      });
    };

    immediateUrls.forEach(prefetchUrl);

    let cancelled = false;
    const scheduleIdle = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      idleUrls.forEach(prefetchUrl);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(scheduleIdle);
    };
  }, [prefetch, blogPosts, gameData, travelData, otherData, webProjects, locale]);

  useEffect(() => {
    if (isClosing && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [isClosing]);

  useEffect(() => {
    markCursorTargetsDirty();
  }, [detail.type, isClosing]);

  useEffect(() => {
    setHudTypingOverlaySuppressed(isDetailMounted && !isClosing);

    return () => {
      setHudTypingOverlaySuppressed(false);
    };
  }, [isClosing, isDetailMounted]);

  const openDetail = useCallback((mode: DetailMode) => {
    if (detailCloseTimeoutRef.current !== null) {
      window.clearTimeout(detailCloseTimeoutRef.current);
      detailCloseTimeoutRef.current = null;
    }
    isClosingRef.current = false;
    setIsClosing(false);
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    setDetail(mode);
  }, []);

  const handleWorkTabClick = useCallback((tabName: string) => {
    setActiveWorkTab(tabName);
  }, []);

  const handleWorkItemClick = useCallback((item: Project) => {
    const coverImg = resolveImageUrl(item.imageUrl, 'large');
    if (coverImg) {
      const img = new Image();
      img.src = coverImg;
    }
    const isWeb = webProjects.some((p) => p.id === item.id);
    if (isWeb) {
      navigateTo(`/${locale}/web/${item.id}`);
    } else {
      openDetail({ type: 'work', item });
    }
  }, [openDetail, navigateTo, webProjects, locale]);

  const handleExperienceItemClick = useCallback((item: ExperienceItem) => {
    openDetail({ type: 'experience', item });
  }, [openDetail]);

  const handleLifeTabClick = useCallback((tabName: string) => {
    setActiveLifeTab(tabName);
  }, []);

  const handleLifeItemClick = useCallback((item: LifeItem) => {
    const coverImg = resolveImageUrl(item.imageUrl, 'large');
    if (coverImg) {
      const img = new Image();
      img.src = coverImg;
    }
    navigateTo(`/${locale}/life/${item.id}`);
  }, [navigateTo, locale]);

  const handleCopyEmail = useCallback(() => {
    navigator.clipboard.writeText(siteConfig.email).then(() => {
      setIsEmailCopied(true);
      setTimeout(() => setIsEmailCopied(false), 1500);
    }).catch(err => console.error('Failed to copy email:', err));
  }, []);

  const handleShowFriendLinks = useCallback(() => {
    navigateTo(`/${locale}/friends`);
  }, [navigateTo, locale]);

  const handleBlogItemClick = useCallback((post: BlogPostMeta) => {
    navigateTo(buildBlogPostHref(locale, post.slug, locale));
  }, [navigateTo, locale]);

  const handleBackFromDetail = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setBackOverride(null);
    detailCloseTimeoutRef.current = window.setTimeout(() => {
      setDetail({ type: 'none' });
      setIsClosing(false);
      isClosingRef.current = false;
      detailCloseTimeoutRef.current = null;
    }, CONTENT_DETAIL_EXIT_DELAY_MS);
  }, [setBackOverride]);

  useEffect(() => {
    if (isDetailMounted && !isClosing) {
      setBackOverride(handleBackFromDetail);
    }
  }, [isDetailMounted, isClosing, setBackOverride, handleBackFromDetail]);

  const handleDetailAnimEnd = useCallback((e: React.AnimationEvent) => {
    if (e.target !== detailRef.current) return;
    if (isClosingRef.current) {
      if (detailCloseTimeoutRef.current !== null) {
        window.clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      setDetail({ type: 'none' });
      setIsClosing(false);
      isClosingRef.current = false;
    }
  }, []);

  return (
    <>
      <div
        ref={(element) => {
          scrollContainerRef.current = element;
          registerScrollContainer(element);
        }}
        className={`${styles.contentWrapper}${
          isDetailMounted && !isClosing ? ` ${styles.detailOpen}` : ''
        }${
          isClosing ? ` ${styles.detailClosing}` : ''
        }`}
      >
        <div id="section-works" className={contentStyles.sectionAnchor}>
          <WorksSection
            worksSectionRef={worksSectionRef}
            activeWorkTab={activeWorkTab}
            handleWorkTabClick={handleWorkTabClick}
            workContentAreaRef={workContentAreaRef}
            webTabRef={webTabRef}
            gameTabRef={gameTabRef}
            webProjects={webProjects}
            gameProjects={gameProjects}
            earlyProjects={earlyProjects}
            handleWorkItemClick={handleWorkItemClick}
            skillCategories={skillCategories}
          />
        </div>

        <div id="section-experience" className={contentStyles.sectionAnchor}>
          <ExperienceSection
            experienceSectionRef={experienceSectionRef}
            experienceData={experienceData}
            handleExperienceItemClick={handleExperienceItemClick}
          />
        </div>

        <div id="section-blog" className={contentStyles.sectionAnchor}>
          <BlogSection
            blogSectionRef={blogSectionRef}
            locale={locale}
            posts={blogPosts}
            handleBlogItemClick={handleBlogItemClick}
          />
        </div>

        <div id="section-life" className={contentStyles.sectionAnchor}>
          <LifeSection
            lifeSectionRef={lifeSectionRef}
            activeSection="content"
            activeLifeTab={activeLifeTab}
            handleLifeTabClick={handleLifeTabClick}
            lifeContentAreaRef={lifeContentAreaRef}
            lifeGameTabRef={lifeGameTabRef}
            lifeTravelTabRef={lifeTravelTabRef}
            lifeArtTabRef={lifeArtTabRef}
            lifeOtherTabRef={lifeOtherTabRef}
            gameData={gameData}
            travelData={travelData}
            otherData={otherData}
            alsoPlayGames={alsoPlayGames}
            artPlaceholderText={artPlaceholderText}
            handleLifeItemClick={handleLifeItemClick}
          />
        </div>

        <div id="section-contact" className={contentStyles.sectionAnchor}>
          <ContactSection
            contactSectionRef={contactSectionRef}
            handleCopyEmail={handleCopyEmail}
            isEmailCopied={isEmailCopied}
            handleShowFriendLinks={handleShowFriendLinks}
          />
        </div>

        <div id="section-about" className={contentStyles.sectionAnchor}>
          <AboutSection
            aboutSectionRef={aboutSectionRef}
            aboutContentRef={aboutContentRef}
          />
        </div>
      </div>

      {isDetailMounted && (
        <div
          ref={detailRef}
          className={`${styles.detailViewWrapper}${
            !isClosing ? ` ${styles.entering}` : ` ${styles.exiting}`
          }`}
          onAnimationEnd={handleDetailAnimEnd}
        >
          <button
            className={styles.globalBackButton}
            onClick={handleBackFromDetail}
            style={{ position: 'fixed', zIndex: 10 }}
          >
          </button>
          {detail.type === 'work' && <WorkDetailView item={detail.item} />}
          {detail.type === 'experience' && <ExperienceDetailView item={detail.item} />}
          {detail.type === 'life' && <LifeDetailView item={detail.item} />}
        </div>
      )}
    </>
  );
}
