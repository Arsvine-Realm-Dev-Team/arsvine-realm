import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import BlogSection from '@/features/blog/ui/blog/BlogSection';
import styles from '@/features/blog/styles/BlogSection.module.scss';

describe('BlogSection layout', () => {
  it('uses blog-owned section and list styles', () => {
    const { container } = render(
      <BlogSection
        blogSectionRef={{ current: null }}
        locale="en"
        handleBlogItemClick={vi.fn()}
        posts={[{
          slug: 'signal',
          title: 'Signal',
          date: '2026-07-12',
          excerpt: 'A layout regression test post.',
          tags: [],
          readingMinutes: 1,
          access: { mode: 'public' },
        }]}
      />,
    );

    expect(container.firstElementChild?.classList.contains(styles.contentSection)).toBe(true);
    const postList = container.querySelector(`.${styles.postList}`);
    expect(postList).toBeTruthy();
    expect(postList?.contains(screen.getByText('Signal'))).toBe(true);
  });
});
