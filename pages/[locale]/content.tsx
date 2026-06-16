import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import styles from '../../styles/Home.module.scss';
import { useLayoutAnchors } from '../../contexts/LayoutAnchorsContext';
import { useTransition } from '../../contexts/TransitionContext';

import WorksSection from '../../components/sections/WorksSection';
import ExperienceSection from '../../components/sections/ExperienceSection';
import BlogSection from '../../components/sections/BlogSection';
import LifeSection from '../../components/sections/LifeSection';
import ContactSection from '../../components/sections/ContactSection';
import AboutSection from '../../components/sections/AboutSection';

import WorkDetailView from '../../components/detail/WorkDetailView';
import ExperienceDetailView from '../../components/detail/ExperienceDetailView';
import LifeDetailView from '../../components/detail/LifeDetailView';
import HreflangLinks from '../../components/shared/HreflangLinks';

import { getAllPostsForLocale } from '../../lib/blog';
import { buildBlogPostHref } from '../../lib/blog-client';
import { setHudTypingOverlaySuppressed } from '../../lib/hud-typing-visibility';
import { siteConfig } from '../../data/site';
import { loadProjects, loadLife, loadExperience, loadSkills, loadMessages } from '../../lib/i18n-data';
import { locales, type Locale } from '../../i18n/config';
import type { BlogPostMeta, Project, LifeItem, ExperienceItem, SkillCategory } from '../../types';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type DetailMode =
  | { type: 'none' }
  | { type: 'work'; item: Project }
  | { type: 'experience'; item: ExperienceItem }
  | { type: 'life'; item: LifeItem };

interface ContentPageProps {
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
  const router = useRouter();
  const { navigateTo, setBackOverride } = useTransition();
  const { registerScrollContainer } = useLayoutAnchors();
  const tSite = useTranslations('pages.site');

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
  const detailRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  const isDetailMounted = detail.type !== 'none';

  useIsomorphicLayoutEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const el = document.getElementById(`section-${hash}`);
    if (el) {
      el.scrollIntoView({ block: 'start' });
    }
  }, []);

  useEffect(() => {
    return () => { setBackOverride(null); };
  }, [setBackOverride]);

  useEffect(() => {
    const prefetched = new Set<string>();
    const publicBlogPosts = blogPosts.filter((post) => post.access.mode === 'public');
    const immediateUrls = [
      ...webProjects.slice(0, 2).map((project) => `/${locale}/web/${project.id}`),
      ...gameProjects.slice(0, 2).map((project) => `/${locale}/game/${project.id}`),
      ...publicBlogPosts.slice(0, 4).map((post) => buildBlogPostHref(locale, post.slug, locale)),
    ];
    const idleUrls = [
      ...gameData.slice(0, 2).map((item) => `/${locale}/life/${item.id}`),
      ...travelData.slice(0, 1).map((item) => `/${locale}/life/${item.id}`),
      ...otherData.slice(0, 1).map((item) => `/${locale}/life/${item.id}`),
      ...webProjects.slice(2).map((project) => `/${locale}/web/${project.id}`),
      ...gameProjects.slice(2).map((project) => `/${locale}/game/${project.id}`),
      ...publicBlogPosts.slice(4).map((post) => buildBlogPostHref(locale, post.slug, locale)),
    ];

    const prefetchUrl = (url: string) => {
      if (prefetched.has(url)) {
        return;
      }
      prefetched.add(url);
      void router.prefetch(url);
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
  }, [router, blogPosts, gameData, travelData, otherData, gameProjects, webProjects, locale]);

  useEffect(() => {
    if (isClosing && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [isClosing]);

  useEffect(() => {
    window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'));
  }, [detail.type, isClosing]);

  useEffect(() => {
    setHudTypingOverlaySuppressed(isDetailMounted && !isClosing);

    return () => {
      setHudTypingOverlaySuppressed(false);
    };
  }, [isClosing, isDetailMounted]);

  const openDetail = useCallback((mode: DetailMode) => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    setDetail(mode);
  }, []);

  const handleWorkTabClick = useCallback((tabName: string) => {
    setActiveWorkTab(tabName);
  }, []);

  const handleWorkItemClick = useCallback((item: Project) => {
    const coverImg = item.imageUrl?.split('?')[0];
    if (coverImg) {
      const img = new Image();
      img.src = coverImg;
    }
    const isGame = gameProjects.some((p) => p.id === item.id);
    const isWeb = webProjects.some((p) => p.id === item.id);
    if (isGame) {
      navigateTo(`/${locale}/game/${item.id}`);
    } else if (isWeb) {
      navigateTo(`/${locale}/web/${item.id}`);
    } else {
      openDetail({ type: 'work', item });
    }
  }, [openDetail, navigateTo, gameProjects, webProjects, locale]);

  const handleExperienceItemClick = useCallback((item: ExperienceItem) => {
    openDetail({ type: 'experience', item });
  }, [openDetail]);

  const handleLifeTabClick = useCallback((tabName: string) => {
    setActiveLifeTab(tabName);
  }, []);

  const handleLifeItemClick = useCallback((item: LifeItem) => {
    const coverImg = item.imageUrl?.split('?')[0];
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
  }, [setBackOverride]);

  useEffect(() => {
    if (isDetailMounted && !isClosing) {
      setBackOverride(handleBackFromDetail);
    }
  }, [isDetailMounted, isClosing, setBackOverride, handleBackFromDetail]);

  const handleDetailAnimEnd = useCallback((e: React.AnimationEvent) => {
    if (e.target !== detailRef.current) return;
    if (isClosingRef.current) {
      setDetail({ type: 'none' });
      setIsClosing(false);
      isClosingRef.current = false;
    }
  }, []);

  const isDetailOpen = isDetailMounted && !isClosing;

  const detailTitle = isDetailOpen
    ? detail.type === 'work'
      ? `${detail.item.title} - WORKS`
      : detail.type === 'experience'
        ? `${detail.item.title} - EXPERIENCE`
        : `${detail.item.title} - LIFE`
    : tSite('title');

  return (
    <>
      <Head>
        <title>{detailTitle}</title>
        <meta property="og:type" content="website" />
        {!isDetailOpen && (
          <meta name="description" content={pageDescription} />
        )}
        <HreflangLinks basePath="/content" />
      </Head>

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
        <div id="section-works" className={styles.sectionAnchor}>
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

        <div id="section-experience" className={styles.sectionAnchor}>
          <ExperienceSection
            experienceSectionRef={experienceSectionRef}
            experienceData={experienceData}
            handleExperienceItemClick={handleExperienceItemClick}
          />
        </div>

        <div id="section-blog" className={styles.sectionAnchor}>
          <BlogSection
            blogSectionRef={blogSectionRef}
            locale={locale}
            posts={blogPosts}
            handleBlogItemClick={handleBlogItemClick}
          />
        </div>

        <div id="section-life" className={styles.sectionAnchor}>
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

        <div id="section-contact" className={styles.sectionAnchor}>
          <ContactSection
            contactSectionRef={contactSectionRef}
            handleCopyEmail={handleCopyEmail}
            isEmailCopied={isEmailCopied}
            handleShowFriendLinks={handleShowFriendLinks}
          />
        </div>

        <div id="section-about" className={styles.sectionAnchor}>
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

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<ContentPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  const projects = loadProjects(locale);
  const life = loadLife(locale);
  const exp = loadExperience(locale);
  const skills = loadSkills(locale);
  const blogPosts = await getAllPostsForLocale(locale);

  const pageDescription =
    (messages.pages as Record<string, { description?: string }>)?.content?.description ?? '';

  return {
    props: {
      locale,
      messages,
      blogPosts,
      webProjects: projects.webProjects,
      gameProjects: projects.gameProjects,
      earlyProjects: projects.earlyProjects,
      experienceData: exp.experienceData,
      gameData: life.gameData,
      travelData: life.travelData,
      otherData: life.otherData,
      alsoPlayGames: life.alsoPlayGames,
      artPlaceholderText: life.artPlaceholderText,
      skillCategories: skills.skillCategories,
      pageDescription,
    },
    revalidate: 300,
  };
};
