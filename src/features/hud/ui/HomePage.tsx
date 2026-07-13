'use client';

import { useEffect } from 'react';
import { useHudAnimation, useHudColumnHover, useHudPower } from '../model/HudProvider';
import { useTransition } from '../../navigation/model/TransitionProvider';
import NavigationColumns from './layout/NavigationColumns';
import type { Locale } from '@/shared/contracts/locale';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';

interface HomeProps {
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function Home({ locale }: HomeProps) {
  const { prefetch } = useNavigationRuntime();
  const { navigateTo } = useTransition();
  const {
    linesAnimated, pulsingNormalIndices, pulsingReverseIndices,
    textVisible, animationsComplete, columnPhase,
  } = useHudAnimation();
  const { isInverted } = useHudPower();
  const {
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  } = useHudColumnHover();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    void prefetch(`/${locale}/content`);
  }, [prefetch, locale]);

  const handleColumnClick = (columnIndex: number) => {
    if (!animationsComplete) return;
    const sectionHashes = ['works', 'experience', 'blog', 'life', 'contact', 'about'];
    if (columnIndex < sectionHashes.length) {
      navigateTo(`/${locale}/content#${sectionHashes[columnIndex]}`);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <NavigationColumns
          activeSection="home"
          linesAnimated={linesAnimated}
          pulsingNormalIndices={pulsingNormalIndices}
          pulsingReverseIndices={pulsingReverseIndices}
          textVisible={textVisible}
          animationsComplete={animationsComplete}
          isInverted={isInverted}
          columnPhase={columnPhase}
          randomHudTexts={randomHudTexts}
          branchText1={branchText1}
          branchText2={branchText2}
          branchText3={branchText3}
          branchText4={branchText4}
          handleColumnClick={handleColumnClick}
          handleColumnMouseEnter={handleColumnMouseEnter}
          handleColumnMouseLeave={handleColumnMouseLeave}
        />
    </div>
  );
}
