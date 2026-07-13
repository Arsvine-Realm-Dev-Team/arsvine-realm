import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useHudAnimation } from '../../../features/hud/model/HudProvider';
import { useResponsive } from '@/shared/hooks/useMediaQuery';
import {
  createContentHashNavigationRequest,
  type ContentHashNavigationRequest,
  getContentSectionHashFromUrl,
  isHomeUrl,
  resolveNavigationTransitionPlan,
} from './contentHashNavigation';
import { AnimationRunController } from './animationRunController';
import { useLayoutAnchors } from './LayoutAnchorsContext';

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
  pageWrapperRef: React.RefObject<HTMLDivElement | null>;
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
  const { retractColumns, expandColumns } = useHudAnimation();
  const { isMobile: hookIsMobile } = useResponsive();
  const { align: alignContentHash, cancel: cancelContentHashAlignment } = useLayoutAnchors();
  const runControllerRef = useRef(new AnimationRunController());
  const backOverrideRef = useRef<(() => void) | null>(null);
  const navigateToRef = useRef<((url: string, options?: { scroll?: boolean }) => void) | null>(null);

  const processQueue = () => {
    const nextNav = runControllerRef.current.complete();
    if (nextNav && navigateToRef.current) {
      // Use setTimeout to avoid synchronous nested calls
      setTimeout(() => {
        navigateToRef.current?.(nextNav.url, nextNav.options);
      }, 0);
    }
  };

  const revealAfterContentHashAligned = useCallback((
    request: ContentHashNavigationRequest,
    onAligned: () => void,
  ) => {
    void alignContentHash(request).then((result) => {
      if (result !== 'cancelled') onAligned();
    });
  }, [alignContentHash]);

  const navigateTo = useCallback((url: string, options?: { scroll?: boolean }) => {
    const mobile = hookIsMobile || checkMobile();
    const transitionPlan = resolveNavigationTransitionPlan({
      sourcePathname: router.pathname,
      targetUrl: url,
      mobile,
    });
    if (transitionPlan === 'samePageHash') {
      router.push(url, undefined, { scroll: false, ...options });
      return;
    }

    if (!runControllerRef.current.startOrQueue({ url, options })) {
      return;
    }

    const wrapper = pageWrapperRef.current;
    if (!wrapper) {
      runControllerRef.current.cancel();
      router.push(url, undefined, { scroll: false, ...options });
      return;
    }

    const targetContentHash = getContentSectionHashFromUrl(url);
    const contentHashRequest = targetContentHash
      ? createContentHashNavigationRequest(targetContentHash)
      : null;

    const pushThen = (target: string, cb: () => void, pushOpts?: { scroll?: boolean }) => {
      let removeCleanup = () => false;
      const cleanup = () => {
        router.events.off('routeChangeComplete', onComplete);
        removeCleanup();
      };
      const onComplete = () => {
        cleanup();
        cb();
      };
      router.events.on('routeChangeComplete', onComplete);
      removeCleanup = runControllerRef.current.addCleanup(cleanup);
      void Promise.resolve(router.push(target, undefined, { scroll: false, ...pushOpts })).catch(() => {
        cleanup();
        processQueue();
      });
    };

    const wapiSlideIn = () => {
      const anim = wrapper.animate(SLIDE_IN_KF, SLIDE_IN_OPTS);
      runControllerRef.current.setAnimation(anim);
      anim.finished.then(() => {
        wrapper.style.opacity = '';
        wrapper.style.transform = '';
        anim.cancel();
        processQueue();
      }).catch(() => {});
    };

    const wapiDiagExpand = () => {
      wrapper.style.opacity = '';
      const anim = wrapper.animate(DIAG_EXPAND_KF, DIAG_EXPAND_OPTS);
      runControllerRef.current.setAnimation(anim);
      anim.finished.then(() => {
        wrapper.style.clipPath = '';
        wrapper.style.transform = '';
        anim.cancel();
        processQueue();
      }).catch(() => {});
    };

    if (transitionPlan === 'homeForwardMobile' || transitionPlan === 'homeForwardDesktop') {
      if (transitionPlan === 'homeForwardMobile') {
        // Mobile forward: diagonal collapse home → push → diagonal expand content
        retractColumns(() => {});
        const anim = wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
        runControllerRef.current.setAnimation(anim);
        anim.finished.then(() => {
          anim.cancel();
          wrapper.style.clipPath = 'inset(100%)';
          pushThen(url, () => {
            if (contentHashRequest) {
              revealAfterContentHashAligned(contentHashRequest, wapiDiagExpand);
              return;
            }

            wapiDiagExpand();
          }, options);
        }).catch(() => {});
      } else {
        // Desktop forward: retract columns → hide wrapper → push → slide in
        retractColumns(() => {
          wrapper.style.opacity = '0';
          pushThen(url, () => {
            if (contentHashRequest) {
              revealAfterContentHashAligned(contentHashRequest, wapiSlideIn);
              return;
            }

            wapiSlideIn();
          }, options);
        });
      }
    } else if (transitionPlan === 'crossPageHash') {
      const outAnim = wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
      runControllerRef.current.setAnimation(outAnim);
      outAnim.finished.then(() => {
        outAnim.cancel();
        wrapper.style.opacity = '0';
        pushThen(url, () => {
          if (contentHashRequest) {
            revealAfterContentHashAligned(contentHashRequest, wapiSlideIn);
            return;
          }

          wapiSlideIn();
        }, options);
      }).catch(() => {});
    } else if (transitionPlan === 'returnHomeMobile' || transitionPlan === 'returnHomeDesktop') {
      if (transitionPlan === 'returnHomeMobile') {
        // Mobile back: diagonal collapse content → push home → diagonal expand home
        const anim = wrapper.animate(DIAG_COLLAPSE_KF, DIAG_COLLAPSE_OPTS);
        runControllerRef.current.setAnimation(anim);
        anim.finished.then(() => {
          anim.cancel();
          wrapper.style.clipPath = 'inset(100%)';
          pushThen(url, () => {
            expandColumns();
            wapiDiagExpand();
          });
        }).catch(() => {});
      } else {
        // Desktop back: slide out → push home → expand columns
        const anim = wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
        runControllerRef.current.setAnimation(anim);
        anim.finished.then(() => {
          anim.cancel();
          wrapper.style.opacity = '0';
          pushThen(url, () => {
            wrapper.style.opacity = '';
            expandColumns(() => {
              processQueue();
            });
          });
        }).catch(() => {});
      }
    } else if (transitionPlan === 'blogDetailFade') {
      // Blog detail: push immediately so the URL changes first, then fade once the target is ready.
      wrapper.style.transition = 'opacity 0.3s ease-out';
      wrapper.style.opacity = '0';
      pushThen(url, () => {
        wrapper.style.transition = 'opacity 0.4s ease-in';
        wrapper.style.opacity = '1';

        const onFadeIn = () => {
          wrapper.style.transition = '';
          wrapper.style.opacity = '';
          processQueue();
        };
        runControllerRef.current.waitForTransition(wrapper, 500, onFadeIn);
      }, options);
    } else {
      // Other: WAAPI slide out → push → WAAPI slide in
      const outAnim = wrapper.animate(SLIDE_OUT_KF, SLIDE_OUT_OPTS);
      runControllerRef.current.setAnimation(outAnim);
      outAnim.finished.then(() => {
        outAnim.cancel();
        wrapper.style.opacity = '0';
        pushThen(url, wapiSlideIn, options);
      }).catch(() => {});
    }
  }, [
    router,
    pageWrapperRef,
    retractColumns,
    expandColumns,
    hookIsMobile,
    revealAfterContentHashAligned,
  ]);

  // Keep navigateToRef updated
  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  // 卸载时清理任何未完成的兜底 timer / transitionend 监听，避免在已 stale 的
  // wrapper / state 上触发副作用（"导航卡死 / 双闪烁"竞态来源之一）。
  useEffect(() => {
    const runController = runControllerRef.current;
    return () => {
      cancelContentHashAlignment();
      runController.cancel();
    };
  }, [cancelContentHashAlignment]);

  // Handle browser back/forward navigation (popstate) that bypasses navigateTo
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // 任何形如 /<locale> 的 URL 都视为 home，触发列展开
      if (isHomeUrl(url) && !runControllerRef.current.isRunning()) {
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
