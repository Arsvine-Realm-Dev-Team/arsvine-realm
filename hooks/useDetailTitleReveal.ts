import { useEffect } from 'react';
import gsap from 'gsap';

interface UseDetailTitleRevealOptions {
  titleRef: React.RefObject<HTMLElement | null>;
  wrapperClassName: string;
  innerClassName: string;
}

export function useDetailTitleReveal({
  titleRef,
  wrapperClassName,
  innerClassName,
}: UseDetailTitleRevealOptions) {
  useEffect(() => {
    if (!titleRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!titleRef.current) {
        return;
      }

      const wrappers = titleRef.current.querySelectorAll(`.${wrapperClassName}`);
      const inners = titleRef.current.querySelectorAll(`.${innerClassName}`);
      wrappers.forEach((wrapper, index) => {
        const inner = inners[index];
        gsap.set(wrapper, {
          overflow: 'hidden',
          display: 'inline-block',
          position: 'relative',
          verticalAlign: 'top',
        });
        gsap.set(inner, { y: '110%', opacity: 0, display: 'inline-block' });
        gsap.to(inner, {
          y: '0%',
          opacity: 1,
          duration: 0.6,
          delay: 0.6 + index * 0.08,
          ease: 'power3.out',
        });
      });
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [innerClassName, titleRef, wrapperClassName]);
}
