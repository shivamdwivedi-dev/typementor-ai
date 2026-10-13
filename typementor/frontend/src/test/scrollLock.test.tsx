import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import {
  useBodyScrollLock,
  getActiveScrollLockCount,
  resetScrollLocksForTests,
} from '../utils/scrollLock';

function TestOverlay({ open }: { open: boolean }) {
  useBodyScrollLock(open);
  return open ? <div data-testid="overlay">Open</div> : null;
}

describe('Reference-Counted Modal & Drawer Scroll Lock', () => {
  beforeEach(() => {
    resetScrollLocksForTests();
    document.body.style.overflow = '';
  });

  it('locks body scroll when opening one overlay', () => {
    const { rerender } = render(<TestOverlay open={false} />);
    expect(document.body.style.overflow).toBe('');
    expect(getActiveScrollLockCount()).toBe(0);

    rerender(<TestOverlay open={true} />);
    expect(document.body.style.overflow).toBe('hidden');
    expect(getActiveScrollLockCount()).toBe(1);
  });

  it('maintains scroll lock across multiple open overlays and does not unlock when one closes', () => {
    const MultiOverlayHarness = ({
      drawerOpen,
      modalOpen,
      extraClosedWidget,
    }: {
      drawerOpen: boolean;
      modalOpen: boolean;
      extraClosedWidget: boolean;
    }) => (
      <>
        <TestOverlay open={drawerOpen} />
        <TestOverlay open={modalOpen} />
        {/* Simulates an unmounted/closed StreakFireWidget mounted inside the drawer */}
        <TestOverlay open={extraClosedWidget} />
      </>
    );

    // 1. Open mobile drawer (overlay 1) while extraClosedWidget is false
    const { rerender } = render(
      <MultiOverlayHarness drawerOpen={true} modalOpen={false} extraClosedWidget={false} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    expect(getActiveScrollLockCount()).toBe(1);

    // 2. Open streak modal (overlay 2) while drawer is still open
    rerender(
      <MultiOverlayHarness drawerOpen={true} modalOpen={true} extraClosedWidget={false} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    expect(getActiveScrollLockCount()).toBe(2);

    // 3. Close streak modal while mobile drawer remains open -> body must remain locked
    rerender(
      <MultiOverlayHarness drawerOpen={true} modalOpen={false} extraClosedWidget={false} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    expect(getActiveScrollLockCount()).toBe(1);

    // 4. Close the final overlay (mobile drawer) -> body scroll is restored
    rerender(
      <MultiOverlayHarness drawerOpen={false} modalOpen={false} extraClosedWidget={false} />,
    );
    expect(document.body.style.overflow).toBe('');
    expect(getActiveScrollLockCount()).toBe(0);
  });

  it('restores body scroll if an open overlay unmounts directly', () => {
    const { unmount } = render(<TestOverlay open={true} />);
    expect(document.body.style.overflow).toBe('hidden');
    expect(getActiveScrollLockCount()).toBe(1);

    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(getActiveScrollLockCount()).toBe(0);
  });
});
