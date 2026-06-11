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

const CustomCursor = () => {
  const hLineRef = useRef<HTMLDivElement>(null);
  const vLineRef = useRef<HTMLDivElement>(null);
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

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const applyPosition = useCallback((x: number, y: number) => {
    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    const dot = dotRef.current;
    if (!hLine || !vLine || !dot) return;

    hLine.style.transform = `translateY(${y}px)`;
    vLine.style.transform = `translateX(${x}px)`;
    dot.style.transform = `translate(${x - dotSize.current.w / 2}px, ${y - dotSize.current.h / 2}px)`;
  }, []);

  const tick = useCallback(() => {
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

    if (isHovering.current && hoverEl.current) {
      const rect = hoverEl.current.getBoundingClientRect();
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const margin = 60;

      if (mx < rect.left - margin || mx > rect.right + margin ||
          my < rect.top - margin || my > rect.bottom + margin) {
        hoverEl.current = null;
        isHovering.current = false;
        snapTarget.current = null;
        currentLabel.current = '';
        dotSize.current = { w: 24, h: 24 };

        const dot = dotRef.current;
        if (dot) {
          gsap.killTweensOf(dot);
          gsap.to(dot, { width: 24, height: 24, duration: 0.25, ease: 'power2.out' });
        }
        dotRef.current?.classList.remove(styles.hovering);

        const hLine = hLineRef.current;
        const vLine = vLineRef.current;
        if (hLine) { hLine.style.maskImage = ''; hLine.style.webkitMaskImage = ''; }
        if (vLine) { vLine.style.maskImage = ''; vLine.style.webkitMaskImage = ''; }

        const labelEl = labelRef.current;
        if (labelEl) gsap.to(labelEl, { opacity: 0, duration: 0.15 });
      }
    }

    rafId.current = requestAnimationFrame(tick);
  }, [applyPosition]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [tick]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (isHovering.current) return;

      const elements = document.querySelectorAll(SELECTOR);
      let closest: Element | null = null;
      let closestDist = Infinity;

      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest('[data-cursor-no-magnetic]') && !htmlEl.hasAttribute('data-cursor-magnetic')) return;
        if (!isCursorInteractive(htmlEl)) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < MAGNETIC_DISTANCE && dist < closestDist) {
          closestDist = dist;
          closest = el;
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

      const newW = rect.width + 12;
      const newH = rect.height + 12;
      dotSize.current = { w: newW, h: newH };

      const dot = dotRef.current;
      if (dot) {
        gsap.killTweensOf(dot);
        gsap.to(dot, { width: newW, height: newH, duration: 0.3, ease: 'power3.out' });
      }

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
      if (hoverEl.current && hoverEl.current !== e.currentTarget) return;
      hoverEl.current = null;
      isHovering.current = false;
      snapTarget.current = null;
      currentLabel.current = '';

      dotSize.current = { w: 24, h: 24 };

      const dot = dotRef.current;
      if (dot) {
        gsap.killTweensOf(dot);
        gsap.to(dot, { width: 24, height: 24, duration: 0.25, ease: 'power2.out' });
      }

      const labelEl = labelRef.current;
      if (labelEl) {
        gsap.to(labelEl, { opacity: 0, duration: 0.15 });
      }

      dotRef.current?.classList.remove(styles.hovering);

      const hLine = hLineRef.current;
      const vLine = vLineRef.current;
      if (hLine) {
        hLine.style.maskImage = '';
        hLine.style.webkitMaskImage = '';
      }
      if (vLine) {
        vLine.style.maskImage = '';
        vLine.style.webkitMaskImage = '';
      }
    };

    let currentEls: NodeListOf<Element> = document.querySelectorAll(SELECTOR);

    const unbind = () => {
      currentEls.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
      });
    };

    const bind = () => {
      currentEls = document.querySelectorAll(SELECTOR);
      currentEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest('[data-cursor-no-magnetic]') && !htmlEl.hasAttribute('data-cursor-magnetic')) return;
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
      });
    };

    bind();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
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
  }, []);

  useEffect(() => {
    const handleLeave = () => {
      hLineRef.current?.classList.add(styles.hidden);
      vLineRef.current?.classList.add(styles.hidden);
      dotRef.current?.classList.add(styles.hidden);
    };
    const handleEnter = () => {
      hLineRef.current?.classList.remove(styles.hidden);
      vLineRef.current?.classList.remove(styles.hidden);
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
    <div className={styles.cursorRoot}>
      <div ref={hLineRef} className={styles.hLine} />
      <div ref={vLineRef} className={styles.vLine} />
      <div ref={dotRef} className={styles.dot}>
        <div ref={labelRef} className={styles.label} />
      </div>
    </div>
  );
};

export default CustomCursor;
