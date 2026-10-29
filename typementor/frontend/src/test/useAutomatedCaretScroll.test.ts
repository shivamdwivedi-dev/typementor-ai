import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutomatedCaretScroll } from '../utils/useAutomatedCaretScroll';

describe('useAutomatedCaretScroll Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with containerRef and neutral mask style', () => {
    const { result } = renderHook(() =>
      useAutomatedCaretScroll({
        activeCharIndex: 0,
        totalLength: 100,
      })
    );

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.canScrollUp).toBe(false);
    expect(result.current.canScrollDown).toBe(false);
    expect(result.current.maskStyle).toEqual({});
  });

  it('resets scroll position to (0,0) when activeCharIndex is 0', () => {
    const scrollToMock = vi.fn();
    const { result } = renderHook(() =>
      useAutomatedCaretScroll({
        activeCharIndex: 0,
        totalLength: 100,
      })
    );

    const mockContainer = document.createElement('div');
    mockContainer.scrollTo = scrollToMock;
    (result.current.containerRef as any).current = mockContainer;

    act(() => {
      result.current.scrollToTop();
    });

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0 })
    );
  });

  it('generates dynamic mask style based on scroll availability', () => {
    const { result } = renderHook(
      ({ activeIndex }) =>
        useAutomatedCaretScroll({
          activeCharIndex: activeIndex,
          totalLength: 500,
        }),
      { initialProps: { activeIndex: 0 } }
    );

    const mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'scrollTop', { value: 50, writable: true });
    Object.defineProperty(mockContainer, 'scrollHeight', { value: 600, writable: true });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 200, writable: true });
    (result.current.containerRef as any).current = mockContainer;

    // Update scroll metrics
    act(() => {
      result.current.updateScrollEdges();
    });

    // Both top and bottom can scroll
    expect(result.current.canScrollUp).toBe(true);
    expect(result.current.canScrollDown).toBe(true);
    expect(result.current.maskStyle.maskImage).toContain('transparent 0%');
    expect(result.current.maskStyle.maskImage).toContain('transparent 100%');
  });

  it('handles manual interaction by pausing auto-scroll and resuming on next keystroke', () => {
    const { result, rerender } = renderHook(
      ({ activeIndex }) =>
        useAutomatedCaretScroll({
          activeCharIndex: activeIndex,
          totalLength: 200,
        }),
      { initialProps: { activeIndex: 10 } }
    );

    const mockContainer = document.createElement('div');
    const scrollToMock = vi.fn();
    mockContainer.scrollTo = scrollToMock;
    (result.current.containerRef as any).current = mockContainer;

    // Trigger manual wheel scroll
    act(() => {
      mockContainer.dispatchEvent(new Event('wheel'));
    });

    // Advance timer past the 1200ms manual debounce
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    // Advance keystroke to resume auto-scroll
    rerender({ activeIndex: 11 });
    expect(result.current.containerRef.current).toBe(mockContainer);
  });

  it('respects prefers-reduced-motion accessibility preference', () => {
    // Mock matchMedia returning prefers-reduced-motion: true
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const scrollToMock = vi.fn();
    const { result } = renderHook(() =>
      useAutomatedCaretScroll({
        activeCharIndex: 0,
        totalLength: 100,
      })
    );

    const mockContainer = document.createElement('div');
    mockContainer.scrollTo = scrollToMock;
    (result.current.containerRef as any).current = mockContainer;

    act(() => {
      result.current.scrollToTop();
    });

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );

    window.matchMedia = originalMatchMedia;
  });
});
