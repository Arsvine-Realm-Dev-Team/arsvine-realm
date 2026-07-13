'use client';

import { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';
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
import { useNavigationRuntime } from './NavigationRuntime';

interface TransitionContextValue {
  navigateTo: (url: string, options?: { scroll?: boolean }) => void;
  setBackOverride: (handler: (() => void) | null) => void;
  handleBack: () => void;
  isDetailOpen: () => boolean;
  registerTransitionSurface: (element: HTMLDivElement | null) => void;
  pendingUrl: string | null;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateTo: () => {},
  setBackOverride: () => {},
  handleBack: () => {},
  isDetailOpen: () => false,
  registerTransitionSurface: () => {},
  pendingUrl: null,
});

export const useTransition = () => useContext(TransitionContext);

interface TransitionProviderProps {
  children: React.ReactNode;
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

export function TransitionProvider({ children }: TransitionProviderProps) {
  const { pathname, asPath, query, push } = useNavigationRuntime();
  const { retractColumns, expandColumns } = useHudAnimation();
  const { isMobile: hookIsMobile } = useResponsive();
  const { align: alignContentHash, cancel: cancelContentHashAlignment } = useLayoutAnchors();
  const runControllerRef = useRef(new AnimationRunController());
  const transitionSurfaceRef = useRef<HTMLDivElement | null>(null);
  const backOverrideRef = useRef<(() => void) | null>(null);
  const navigateToRef = useRef<((url: string, options?: { scroll?: boolean }) => void) | null>(null);
  const pendingCommitRef = useRef<(() => void) | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const registerTransitionSurface = useCallback((element: HTMLDivElement | null) => {
    transitionSurfaceRef.current = element;
  }, []);

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
      sourcePathname: pathname,
      targetUrl: url,
      mobile,
    });
    if (transitionPlan === 'samePageHash') {
      void push(url, { scroll: false, ...options });
      return;
    }

    if (!runControllerRef.current.startOrQueue({ url, options })) {
      return;
    }

    const wrapper = transitionSurfaceRef.current;
    if (!wrapper) {
      runControllerRef.current.cancel();
      void push(url, { scroll: false, ...options });
      return;
    }

    const targetContentHash = getContentSectionHashFromUrl(url);
    const contentHashRequest = targetContentHash
      ? createContentHashNavigationRequest(targetContentHash)
      : null;

    const pushThen = (target: string, cb: () => void, pushOpts?: { scroll?: boolean }) => {
      let removeCleanup = () => false;
      let timeoutId = 0;
      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (pendingCommitRef.current === onComplete) pendingCommitRef.current = null;
        setPendingUrl(null);
        removeCleanup();
      };
      const onComplete = () => {
        cleanup();
        cb();
      };
      pendingCommitRef.current?.();
      pendingCommitRef.current = onComplete;
      setPendingUrl(target);
      removeCleanup = runControllerRef.current.addCleanup(cleanup);
      timeoutId = window.setTimeout(() => {
        if (pendingCommitRef.current === onComplete) {
          cleanup();
          runControllerRef.current.cancel();
          processQueue();
        }
      }, 10_000);
      void push(target, { scroll: false, ...pushOpts }).catch(() => {
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
    pathname,
    push,
    retractColumns,
    expandColumns,
    hookIsMobile,
    revealAfterContentHashAligned,
  ]);

  // Keep navigateToRef updated
  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  useEffect(() => {
    const onComplete = pendingCommitRef.current;
    if (!onComplete) {
      if (isHomeUrl(asPath) && !runControllerRef.current.isRunning()) expandColumns();
      return;
    }
    onComplete();
  }, [asPath, expandColumns]);

  // 卸载时清理任何未完成的兜底 timer / transitionend 监听，避免在已 stale 的
  // wrapper / state 上触发副作用（"导航卡死 / 双闪烁"竞态来源之一）。
  useEffect(() => {
    const runController = runControllerRef.current;
    return () => {
      cancelContentHashAlignment();
      pendingCommitRef.current?.();
      runController.cancel();
    };
  }, [cancelContentHashAlignment]);

  const setBackOverride = useCallback((handler: (() => void) | null) => {
    backOverrideRef.current = handler;
  }, []);

  const handleBack = useCallback(() => {
    if (backOverrideRef.current) {
      backOverrideRef.current();
      return;
    }
    // 路由模板 /[locale] 即为 home
    const isHome = pathname.split('/').filter(Boolean).length === 1;
    if (!isHome) {
      // 用当前 query.locale 拼出 home 路径
      const queryLocale = query.locale;
      const locale = typeof queryLocale === 'string' ? queryLocale : 'zh-CN';
      navigateTo(`/${locale}`);
    }
  }, [pathname, query.locale, navigateTo]);

  const isDetailOpen = useCallback(() => {
    return backOverrideRef.current !== null;
  }, []);

  return (
    <TransitionContext.Provider value={{ navigateTo, setBackOverride, handleBack, isDetailOpen, registerTransitionSurface, pendingUrl }}>
      {children}
    </TransitionContext.Provider>
  );
}
