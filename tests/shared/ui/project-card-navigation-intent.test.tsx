import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProjectCard from '@/shared/ui/ProjectCard';

const project = {
  id: 1,
  title: 'Intent Project',
  description: 'Navigation intent test',
  tech: [],
  imageUrl: '',
};

describe('ProjectCard navigation intent', () => {
  it('prefetches only on primary pointer or keyboard activation', () => {
    const onClick = vi.fn();
    const onNavigateIntent = vi.fn();
    render(
      <ProjectCard
        project={project}
        onClick={onClick}
        onNavigateIntent={onNavigateIntent}
        isInverted={false}
      />,
    );
    const card = screen.getByRole('button', { name: /Intent Project/ });

    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.pointerDown(card, { button: 2 });
    expect(onNavigateIntent).not.toHaveBeenCalled();

    fireEvent.pointerDown(card, { button: 0 });
    expect(onNavigateIntent).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onNavigateIntent).toHaveBeenCalledTimes(3);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
