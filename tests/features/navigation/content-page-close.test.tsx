import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { setBackOverrideMock } = vi.hoisted(() => ({
  setBackOverrideMock: vi.fn(),
}));

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({ navigateTo: vi.fn(), setBackOverride: setBackOverrideMock }),
}));
vi.mock('@/features/navigation/model/LayoutAnchorsContext', () => ({
  useLayoutAnchors: () => ({ registerScrollContainer: vi.fn() }),
}));
vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({ prefetch: vi.fn(() => Promise.resolve()) }),
}));
vi.mock('@/features/portfolio/ui/WorksSection', () => ({
  default: ({ gameProjects, handleWorkItemClick }: {
    gameProjects: Array<{ id: number; title: string }>;
    handleWorkItemClick: (item: unknown) => void;
  }) => <button onClick={() => handleWorkItemClick(gameProjects[0])}>open work</button>,
}));
vi.mock('@/features/experience/ui/ExperienceSection', () => ({ default: () => null }));
vi.mock('@/features/blog/ui/blog/BlogSection', () => ({ default: () => null }));
vi.mock('@/features/life/ui/LifeSection', () => ({ default: () => null }));
vi.mock('@/features/profile/ui/ContactSection', () => ({ default: () => null }));
vi.mock('@/features/profile/ui/AboutSection', () => ({ default: () => null }));
vi.mock('@/features/portfolio/ui/WorkDetailView', () => ({
  default: ({ item }: { item: { title: string } }) => <div>{item.title} detail</div>,
}));
vi.mock('@/features/experience/ui/ExperienceDetailView', () => ({ default: () => null }));
vi.mock('@/features/life/ui/LifeDetailView', () => ({ default: () => null }));

import ContentPage from '@/features/navigation/ui/ContentPage';
import { CONTENT_DETAIL_EXIT_DELAY_MS } from '@/shared/lib/ui-timings';
import type { Project } from '@/shared/types';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ContentPage detail closing', () => {
  it('unmounts a detail view when animationend never arrives', () => {
    vi.useFakeTimers();
    const gameProject: Project = {
      id: 1,
      title: 'Game One',
      description: 'Test project',
      tech: [],
      link: '',
      imageUrl: '',
      galleryImages: [],
    };
    const { container } = render(<ContentPage
      locale="en"
      messages={{}}
      blogPosts={[]}
      webProjects={[]}
      gameProjects={[gameProject]}
      earlyProjects={[]}
      experienceData={[]}
      gameData={[]}
      travelData={[]}
      otherData={[]}
      alsoPlayGames={[]}
      artPlaceholderText=""
      skillCategories={[]}
      pageDescription=""
    />);

    fireEvent.click(screen.getByRole('button', { name: 'open work' }));
    expect(screen.getByText('Game One detail')).toBeTruthy();

    const backButton = container.querySelector('button[class*="globalBackButton"]');
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton as HTMLButtonElement);
    act(() => vi.advanceTimersByTime(CONTENT_DETAIL_EXIT_DELAY_MS));

    expect(screen.queryByText('Game One detail')).toBeNull();
  });
});
