import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import styles from '../../styles/CustomCursor.module.scss';

const MAGNETIC_DISTANCE = 120;
const MAGNETIC_STRENGTH = 0.4;
const SELECTOR = 'a, button, .btn, [role="button"], [data-cursor-magnetic]';

const isCursorInteractive = (el: HTMLElement | null) => {
  if (!el || !el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  let current: HTMLElement | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity || '1') === 0
    ) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
};

const getInteractiveCursorTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) return null;
  const candidate = target.closest(SELECTOR) as HTMLElement | null;
  if (!candidate) return null;
  if (candidate.closest('[data-cursor-no-magnetic]') && !candidate.hasAttribute('data-cursor-magnetic')) {
    return null;
  }
  return isCursorInteractive(candidate) ? candidate : null;
};

const CustomCursor = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const hLineRef = useRef<HTMLDivElement>(null);
  const vLineRef = useRef<HTMLDivElement>(null);
  const xLineARef = useRef<HTMLDivElement>(null);
  const xLineBRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: -100, y: -100 });
  const rendered = useRef({ x: -100, y: -100 });
  const dotSize = useRef({ w: 24, h: 24 });
  const rafId = useRef<number>(0);
  const isHovering = useRef(false);
  const snapTarget = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const currentLabel = useRef('');
  const hoverEl = useRef<HTMLElement | null>(null);
  const interactiveElsRef = useRef<HTMLElement[]>([]);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const applyPosition = useCallback((x: number, y: number) => {
    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    const xLineA = xLineARef.current;
    const xLineB = xLineBRef.current;
    const dot = dotRef.current;
    if (!hLine || !vLine || !xLineA || !xLineB || !dot) return;

    hLine.style.transform = `translateY(${y}px)`;
    vLine.style.transform = `translateX(${x}px)`;
    xLineA.style.left = `${x}px`;
    xLineA.style.top = `${y}px`;
    xLineB.style.left = `${x}px`;
    xLineB.style.top = `${y}px`;
    dot.style.transform = `translate(${x - dotSize.current.w / 2}px, ${y - dotSize.current.h / 2}px)`;
  }, []);

  const applyLineMask = useCallback((target: { x: number; y: number; w: number; h: number } | null) => {
    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    if (!hLine || !vLine) return;

    if (!target) {
      hLine.style.maskImage = '';
      hLine.style.webkitMaskImage = '';
      vLine.style.maskImage = '';
      vLine.style.webkitMaskImage = '';
      return;
    }

    const left = clamp(target.x - target.w / 2, 0, window.innerWidth);
    const right = clamp(target.x + target.w / 2, 0, window.innerWidth);
    const top = clamp(target.y - target.h / 2, 0, window.innerHeight);
    const bottom = clamp(target.y + target.h / 2, 0, window.innerHeight);

    const horizontalMask = `linear-gradient(to right, #000 0, #000 ${left}px, transparent ${left}px, transparent ${right}px, #000 ${right}px, #000 100%)`;
    const verticalMask = `linear-gradient(to bottom, #000 0, #000 ${top}px, transparent ${top}px, transparent ${bottom}px, #000 ${bottom}px, #000 100%)`;

    hLine.style.maskImage = horizontalMask;
    hLine.style.webkitMaskImage = horizontalMask;
    vLine.style.maskImage = verticalMask;
    vLine.style.webkitMaskImage = verticalMask;
  }, []);

  const syncHoverTarget = useCallback(() => {
    const el = hoverEl.current;
    if (!el || !isCursorInteractive(el)) return null;

    const rect = el.getBoundingClientRect();
    const target = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      w: rect.width + 12,
      h: rect.height + 12,
    };

    snapTarget.current = target;
    dotSize.current = { w: target.w, h: target.h };

    const dot = dotRef.current;
    if (dot) {
      gsap.killTweensOf(dot);
      dot.style.width = `${target.w}px`;
      dot.style.height = `${target.h}px`;
    }

    applyPosition(rendered.current.x, rendered.current.y);
    applyLineMask(target);
    return rect;
  }, [applyLineMask, applyPosition]);

  const resetHoverState = useCallback(() => {
    hoverEl.current = null;
    isHovering.current = false;
    snapTarget.current = null;
    currentLabel.current = '';
    dotSize.current = { w: 24, h: 24 };

    const dot = dotRef.current;
    if (dot) {
      gsap.killTweensOf(dot);
      dot.style.width = '24px';
      dot.style.height = '24px';
      dot.classList.remove(styles.hovering);
    }

    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    if (hLine) { hLine.style.maskImage = ''; hLine.style.webkitMaskImage = ''; }
    if (vLine) { vLine.style.maskImage = ''; vLine.style.webkitMaskImage = ''; }

    const labelEl = labelRef.current;
    if (labelEl) {
      gsap.killTweensOf(labelEl);
      gsap.to(labelEl, { opacity: 0, duration: 0.15 });
    }
  }, []);

  const collectInteractiveElements = useCallback(() => {
    interactiveElsRef.current = Array.from(document.querySelectorAll(SELECTOR)).filter((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.closest('[data-cursor-no-magnetic]') && !htmlEl.hasAttribute('data-cursor-magnetic')) {
        return false;
      }
      return true;
    }) as HTMLElement[];
  }, []);

  useEffect(() => {
    const tick = () => {
      if (isHovering.current && (!hoverEl.current || !isCursorInteractive(hoverEl.current))) {
        resetHoverState();
      }

      let hoverRect: DOMRect | null = null;
      if (isHovering.current) {
        hoverRect = syncHoverTarget();
        if (!hoverRect) {
          resetHoverState();
        }
      }

      const target = snapTarget.current;
      let tx = mouse.current.x;
      let ty = mouse.current.y;

      if (target) {
        tx = target.x;
        ty = target.y;
      }

      const speed = isHovering.current ? 0.15 : 0.25;
      rendered.current.x = lerp(rendered.current.x, tx, speed);
      rendered.current.y = lerp(rendered.current.y, ty, speed);

      applyPosition(rendered.current.x, rendered.current.y);

      if (isHovering.current && hoverRect) {
        const mx = mouse.current.x;
        const my = mouse.current.y;
        const margin = 60;

        if (mx < hoverRect.left - margin || mx > hoverRect.right + margin ||
            my < hoverRect.top - margin || my > hoverRect.bottom + margin) {
          resetHoverState();
        }
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [applyPosition, resetHoverState, syncHoverTarget]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (isHovering.current) return;

      let closest: Element | null = null;
      let closestDist = Infinity;

      interactiveElsRef.current.forEach((htmlEl) => {
        if (!isCursorInteractive(htmlEl)) return;
        const rect = htmlEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < MAGNETIC_DISTANCE && dist < closestDist) {
          closestDist = dist;
          closest = htmlEl;
        }
      });

      if (closest) {
        const rect = (closest as HTMLElement).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pull = (1 - closestDist / MAGNETIC_DISTANCE) * MAGNETIC_STRENGTH;
        mouse.current.x = lerp(e.clientX, cx, pull);
        mouse.current.y = lerp(e.clientY, cy, pull);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    const handleEnter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      if (!isCursorInteractive(el)) return;
      const rect = el.getBoundingClientRect();
      hoverEl.current = el;
      isHovering.current = true;
      snapTarget.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        w: rect.width,
        h: rect.height,
      };

      const label = el.getAttribute('data-cursor-label') || el.getAttribute('aria-label') || '';
      currentLabel.current = label;
      syncHoverTarget();

      const labelEl = labelRef.current;
      if (labelEl) {
        labelEl.textContent = label;
        if (label) {
          gsap.to(labelEl, { opacity: 1, duration: 0.2 });
        }
      }

      dotRef.current?.classList.add(styles.hovering);
    };

    const handleLeave = (e: Event) => {
      const nextTarget = getInteractiveCursorTarget((e as MouseEvent).relatedTarget);
      if (nextTarget && nextTarget !== hoverEl.current) return;
      if (hoverEl.current && hoverEl.current !== e.currentTarget) return;
      resetHoverState();
    };

    let currentEls: HTMLElement[] = [];

    const unbind = () => {
      currentEls.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
      });
    };

    const bind = () => {
      collectInteractiveElements();
      currentEls = interactiveElsRef.current;
      currentEls.forEach((el) => {
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
      });
    };

    bind();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      if (hoverEl.current && !hoverEl.current.isConnected) {
        resetHoverState();
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        unbind();
        bind();
      }, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
      unbind();
    };
  }, [collectInteractiveElements, resetHoverState, syncHoverTarget]);

  useEffect(() => {
    const handleScroll = () => {
      if (isHovering.current) resetHoverState();
    };
    const handleBlur = () => resetHoverState();
    const handleVisibilityChange = () => {
      if (document.hidden) resetHoverState();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetHoverState]);

  useEffect(() => {
    const handleTesseractCursorHover = (event: Event) => {
      const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
      rootRef.current?.classList.toggle(styles.tesseractMode, active);
    };

    window.addEventListener('arsvine:tesseract-cursor-hover', handleTesseractCursorHover as EventListener);
    return () => {
      window.removeEventListener('arsvine:tesseract-cursor-hover', handleTesseractCursorHover as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleLeave = () => {
      hLineRef.current?.classList.add(styles.hidden);
      vLineRef.current?.classList.add(styles.hidden);
      xLineARef.current?.classList.add(styles.hidden);
      xLineBRef.current?.classList.add(styles.hidden);
      dotRef.current?.classList.add(styles.hidden);
    };
    const handleEnter = () => {
      hLineRef.current?.classList.remove(styles.hidden);
      vLineRef.current?.classList.remove(styles.hidden);
      xLineARef.current?.classList.remove(styles.hidden);
      xLineBRef.current?.classList.remove(styles.hidden);
      dotRef.current?.classList.remove(styles.hidden);
    };

    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);
    return () => {
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.cursorRoot}>
      <div ref={hLineRef} className={styles.hLine} />
      <div ref={vLineRef} className={styles.vLine} />
      <div ref={xLineARef} className={styles.xLineA} />
      <div ref={xLineBRef} className={styles.xLineB} />
      <div ref={dotRef} className={styles.dot}>
        <span className={`${styles.corner} ${styles.cornerTl}`} />
        <span className={`${styles.corner} ${styles.cornerTr}`} />
        <span className={`${styles.corner} ${styles.cornerBl}`} />
        <span className={`${styles.corner} ${styles.cornerBr}`} />
        <div ref={labelRef} className={styles.label} />
      </div>
    </div>
  );
};

export default CustomCursor;
