import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useNotFoundPresence,
  useRegisterNotFoundPresence,
} from '@/features/navigation/model/notFoundPresence';

function NotFoundMarker() {
  useRegisterNotFoundPresence();
  return null;
}

function PresenceProbe({ showNotFound }: { showNotFound: boolean }) {
  const isNotFound = useNotFoundPresence();

  return (
    <>
      <span data-testid="presence">{String(isNotFound)}</span>
      {showNotFound && <NotFoundMarker />}
    </>
  );
}

describe('not-found presence', () => {
  it('registers a mounted not-found view and clears it after unmount', () => {
    const view = render(<PresenceProbe showNotFound={false} />);

    expect(screen.getByTestId('presence').textContent).toBe('false');

    view.rerender(<PresenceProbe showNotFound />);
    expect(screen.getByTestId('presence').textContent).toBe('true');

    view.rerender(<PresenceProbe showNotFound={false} />);
    expect(screen.getByTestId('presence').textContent).toBe('false');
  });
});
