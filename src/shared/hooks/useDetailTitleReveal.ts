import { useEffect } from 'react';
import { animateTitleCharacters } from '@/shared/lib/title-reveal';

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

    return animateTitleCharacters({
      root: titleRef.current,
      wrapperSelector: `.${wrapperClassName}`,
      innerSelector: `.${innerClassName}`,
    });
  }, [innerClassName, titleRef, wrapperClassName]);
}
