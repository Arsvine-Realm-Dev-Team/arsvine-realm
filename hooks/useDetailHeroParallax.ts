import { useEffect } from 'react';

export function useDetailHeroParallax(
  wrapperRef: React.RefObject<HTMLElement | null>,
  heroBgRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const heroBg = heroBgRef.current;
    if (!wrapper || !heroBg) {
      return;
    }

    let frameId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        heroBg.style.transform = `translateY(${wrapper.scrollTop * 0.35}px)`;
      });
    };

    const timeoutId = window.setTimeout(() => {
      wrapper.addEventListener('scroll', handleScroll, { passive: true });
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
      wrapper.removeEventListener('scroll', handleScroll);
    };
  }, [heroBgRef, wrapperRef]);
}
