import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from './AppContext';
import { useResponsive } from '../hooks/useMediaQuery';

interface TransitionContextValue {
  navigateTo: (url: string, options?: { scroll?: boolean }) => void;
  setBackOverride: (handler: (() => void) | null) => void;
  handleBack: () => void;
  isDetailOpen: () => boolean;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateTo: () => {},
  setBackOverride: () => {},
  handleBack: () => {},
  isDetailOpen: () => false,
});

export const useTransition = () => useContext(TransitionContext);

interface TransitionProviderProps {
  children: React.ReactNode;
  pageWrapperRef: React.RefObject<HTMLDivElement>;
}

const SLIDE_IN_KF: Keyframe[] = [
  { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
];
const SLIDE_IN_OPTS: KeyframeAnimationOptions = {
  duration: 1800,
  easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
  fill: 'both',
};

const SLIDE_OUT_KF: Keyframe[] = [
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
];
const SLIDE_OUT_OPTS: KeyframeAnimationOptions = {
  duration: 500,
  easing: 'ease-in',
  fill: 'forwards',
};

const DIAG_EXPAND_KF: Keyframe[] = [
  { clipPath: 'inset(4% 100% 100% 4%)' },
  { clipPath: 'inset(0 0 0 0)' },
];
const DIAG_EXPAND_OPTS: KeyframeAnimationOptions = {
  duration: 900,
  easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
  fill: 'both',
};

const DIAG_COLLAPSE_KF: Keyframe[] = [
  { clipPath: 'inset(0 0 0 0)' },
  { clipPath: 'inset(100% 0 0 100%)' },
];
const DIAG_COLLAPSE_OPTS: KeyframeAnimationOptions = {
  duration: 400,
  easing: 'ease-in',
  fill: 'forwards',
};

const checkMobile = () => {
  // fallback for非 hook 上下文（handleLoadingComplete 等）—— 主流程已走 useResponsive。
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
};

export function TransitionProvider({ children, pageWrapperRef }: TransitionProviderProps) {
  const router = useRouter();
  const { retractColumns, expandColumns } = useApp();
  const { isMobile: hookIsMobile } = useResponsive();
  const isTransitioning = useRef(false);
  const queuedNav = useRef<{ url: string; options?: { scroll?: boolean } } | null>(null);
  const backOverrideRef = useRef<(() => void) | null>(null);
  const activeAnim = useRef<Animation | null>(null);
  const navigateToRef = useRef<((url: string, options?: { scroll?: boolean }) => void) | null>(null);
  // 收集所有"未完成的兜底 timeout / 一次性 transitionend 监听器"，
  // 让 cleanup 与新一轮 navigateTo 都能取消上一次遗留的副作用，避免 setState-after-unmount
  // 与"双闪烁"竞态。每一项都包括 clear/remove 自身的逻辑，即可调用即可清理。
  const pendingCleanupsRef = useRef<Array<() => void>>([]);

  const runPendingCleanups = useCallback(() => {
    const cleanups = pendingCleanupsRef.current;
    pendingCleanupsRef.current = [];
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        // 单个清理失败不影响其他
      }
    }
  }, []);

  const cancelActiveAnim = () => {
    if (activeAnim.current) {
      activeAnim.current.cancel();
      activeAnim.current = null;
    }
  };

  const processQueue = () => {
    if (queuedNav.current && navigateToRef.current) {
      const nextNav = queuedNav.current;
      queuedNav.current = null;
      // Use setTimeout to avoid synchronous nested calls
      setTimeout(() => {
        navigateToRef.current?.(nextNav.url, nextNav.options);
      }, 0);
    }
  };

  const navigateTo = useCallback((url: string, options?: { scroll?: boolean }) => {
    if (isTransitioning.current) {
      // If returning to the same URL we are currently transitioning to, ignore.
      queuedNav.current = { url, options };
      return;
    }

    const wrapper = pageWrapperRef.current;
    if (!wrapper) {
      router.push(url, undefined, { scroll: false, ...options });
      return;
    }

    isTransitioning.current = true;
    queuedNav.current = null;
    cancelActiveAnim();
    // 新一轮转场开始前，清掉上一轮遗留的兜底 timer / 监听（理论上应已自清，
    // 这里是防御性保险），避免上一轮 onFadeIn 在新 wrapper 状态上误触发。
    runPendingCleanups();
    // Home / 跳回 home 的判定：路由模板是 /[locale]
    const currentlyHome = router.pathname === '/[locale]';
    // 目标是 home 的判定：URL 形如 /<locale> 或 /<locale>/
    const goingHome = /^\/[A-Za-z-]+\/?$/.test(url);
    // 目标是博客详情页：URL 形如 /<locale>/blog/<slug>
    const goingBlogDetail = /^\/[A-Za-z-]+\/blog\/[^/]+/.test(url);

    const pushThen = (target: string, cb: () => void, pushOpts?: { scroll?: boolean }) => {
      const onComplete = () => {
        router.events.off('routeChangeComplete', onComplete);
        cb();
      };
      router.events.on('routeChangeComplete', onComplete);
      router.push(target, undefined, { scroll: false, ...pushOpts });
    };

    const wapiSlideIn = () => {
      const anim = wrapper.animate(SLIDE_IN_KF, SLIDE_IN_OPTS);
      activeAnim.current = anim;
      anim.finished.then(() => {
        wrapper.style.opacity = '';
        wrapper.style.transform = '';
        anim.cancel();
        activeAnim.current = null;
        isTransitioning.current = false;
        processQueue();
      }).catch(() => {});
    };

    const mobile = hookIsMobile || checkMobile();

    const wapiDiagExpand = () => {
      wrapper.style.opacity = '';
      const anim = wrapper.animate(DIAG_EXPAND_KF, DIAG_EXPAND_OPTS);
      activeAnim.current = anim;
      anim.finished.then(() => {
        wrapper.style.clipPath = '';
        wrapper.style.transform = '';
        anim.cancel();
        activeAnim.current = null;
        isTransitioning.current = false;
        processQueue();
      }).catch(() => {});
    };

    if (currentlyHome && !goingHome) {
      if (mobile) {
        // Mobile forward: diagonal collapse home → push → diagonal expand content
        retractColumns(() => {});
        const anim = wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
        activeAnim.current = anim;
        anim.finished.then(() => {
          anim.cancel();
          activeAnim.current = null;
          wrapper.style.clipPath = 'inset(100%)';
          pushThen(url, wapiDiagExpand, options);
        }).catch(() => {});
      } else {
        // Desktop forward: retract columns → hide wrapper → push → slide in
        retractColumns(() => {
          wrapper.style.opacity = '0';
          pushThen(url, wapiSlideIn, options);
        });
      }
    } else if (!currentlyHome && goingHome) {
      if (mobile) {
        // Mobile back: diagonal collapse content → push home → diagonal expand home
        const anim = wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
        activeAnim.current = anim;
        anim.finished.then(() => {
          anim.cancel();
          activeAnim.current = null;
          wrapper.style.clipPath = 'inset(100%)';
          pushThen(url, () => {
            expandColumns();
            wapiDiagExpand();
          });
        }).catch(() => {});
      } else {
        // Desktop back: slide out → push home → expand columns
        const anim = wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
        activeAnim.current = anim;
        anim.finished.then(() => {
          anim.cancel();
          activeAnim.current = null;
          wrapper.style.opacity = '0';
          pushThen(url, () => {
            wrapper.style.opacity = '';
            expandColumns(() => {
              isTransitioning.current = false;
              processQueue();
            });
          });
        }).catch(() => {});
      }
    } else if (goingBlogDetail) {
      // Blog detail: push immediately so the URL changes first, then fade once the target is ready.
      wrapper.style.transition = 'opacity 0.3s ease-out';
      wrapper.style.opacity = '0';
      pushThen(url, () => {
        wrapper.style.transition = 'opacity 0.4s ease-in';
        wrapper.style.opacity = '1';

        // transitionend + 500ms 兜底 timer 双保险，但只能跑一次；
        // 哪一边先到，就把另一边连带这个清理项一起从 pending 队列里摘掉，
        // 避免组件卸载或新一轮 navigateTo 来时旧 timer/listener 仍在飞。
        let fired = false;
        let fallbackId: number | null = null;
        const cleanup = () => {
          wrapper.removeEventListener('transitionend', onFadeIn);
          if (fallbackId !== null) {
            window.clearTimeout(fallbackId);
            fallbackId = null;
          }
          pendingCleanupsRef.current = pendingCleanupsRef.current.filter((c) => c !== cleanup);
        };
        const onFadeIn = () => {
          if (fired) return;
          fired = true;
          cleanup();
          wrapper.style.transition = '';
          wrapper.style.opacity = '';
          isTransitioning.current = false;
          processQueue();
        };
        wrapper.addEventListener('transitionend', onFadeIn, { once: true });
        fallbackId = window.setTimeout(onFadeIn, 500);
        pendingCleanupsRef.current.push(cleanup);
      }, options);
    } else {
      // Other: WAAPI slide out → push → WAAPI slide in
      const outAnim = wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
      activeAnim.current = outAnim;
      outAnim.finished.then(() => {
        outAnim.cancel();
        activeAnim.current = null;
        wrapper.style.opacity = '0';
        pushThen(url, wapiSlideIn, options);
      }).catch(() => {});
    }
  }, [router, pageWrapperRef, retractColumns, expandColumns, runPendingCleanups, hookIsMobile]);

  // Keep navigateToRef updated
  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  // 卸载时清理任何未完成的兜底 timer / transitionend 监听，避免在已 stale 的
  // wrapper / state 上触发副作用（"导航卡死 / 双闪烁"竞态来源之一）。
  useEffect(() => {
    return () => {
      runPendingCleanups();
      cancelActiveAnim();
    };
  }, [runPendingCleanups]);

  // Handle browser back/forward navigation (popstate) that bypasses navigateTo
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // 任何形如 /<locale> 的 URL 都视为 home，触发列展开
      if (/^\/[A-Za-z-]+\/?$/.test(url) && !isTransitioning.current) {
        expandColumns();
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, expandColumns]);

  const setBackOverride = useCallback((handler: (() => void) | null) => {
    backOverrideRef.current = handler;
  }, []);

  const handleBack = useCallback(() => {
    if (backOverrideRef.current) {
      backOverrideRef.current();
      return;
    }
    // 路由模板 /[locale] 即为 home
    const isHome = router.pathname === '/[locale]';
    if (!isHome) {
      // 用当前 query.locale 拼出 home 路径
      const queryLocale = router.query?.locale;
      const locale = typeof queryLocale === 'string' ? queryLocale : 'zh-CN';
      navigateTo(`/${locale}`);
    }
  }, [router.pathname, router.query, navigateTo]);

  const isDetailOpen = useCallback(() => {
    return backOverrideRef.current !== null;
  }, []);

  return (
    <TransitionContext.Provider value={{ navigateTo, setBackOverride, handleBack, isDetailOpen }}>
      {children}
    </TransitionContext.Provider>
  );
}
