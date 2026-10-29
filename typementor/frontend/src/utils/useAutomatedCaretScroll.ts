import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface UseAutomatedCaretScrollOptions {
  activeCharIndex: number;
  totalLength: number;
  isZenMode?: boolean;
  lineAnchorRatio?: number;
  enableHorizontalScroll?: boolean;
  enableViewportScroll?: boolean;
  selector?: string;
}

export interface UseAutomatedCaretScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  canScrollUp: boolean;
  canScrollDown: boolean;
  maskStyle: React.CSSProperties;
  scrollToTop: () => void;
  resetScroll: () => void;
  updateScrollEdges: () => void;
}

/**
 * High-performance, cross-device automated caret tracking & smooth viewport scrolling hook.
 * Compatible with mobile virtual keyboards (window.visualViewport), 120Hz+ displays,
 * horizontal coding indentation, and reduced-motion accessibility settings.
 */
export function useAutomatedCaretScroll({
  activeCharIndex,
  totalLength,
  isZenMode = false,
  enableHorizontalScroll = true,
  enableViewportScroll = true,
  selector = '[data-caret="true"]',
}: UseAutomatedCaretScrollOptions): UseAutomatedCaretScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check prefers-reduced-motion for accessibility
  const prefersReducedMotion = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const updateScrollEdges = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const hasUp = el.scrollTop > 8;
    const hasDown = el.scrollHeight - el.scrollTop - el.clientHeight > 8;

    setCanScrollUp(prev => (prev !== hasUp ? hasUp : prev));
    setCanScrollDown(prev => (prev !== hasDown ? hasDown : prev));
  }, []);

  // Gracefully handle manual user wheel / touch interactions without fighting gestures
  const handleManualInteraction = useCallback(() => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1200);
    updateScrollEdges();
  }, [updateScrollEdges]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleManualInteraction, { passive: true });
    el.addEventListener('touchmove', handleManualInteraction, { passive: true });
    el.addEventListener('scroll', updateScrollEdges, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleManualInteraction);
      el.removeEventListener('touchmove', handleManualInteraction);
      el.removeEventListener('scroll', updateScrollEdges);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [handleManualInteraction, updateScrollEdges]);

  // Mobile virtual keyboard handling via window.visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport || isZenMode) return;

    const handleVisualViewportChange = () => {
      if (!containerRef.current) return;
      const caretEl = containerRef.current.querySelector(selector) as HTMLElement | null;
      if (!caretEl) return;

      const caretRect = caretEl.getBoundingClientRect();
      const vv = window.visualViewport;
      if (!vv) return;

      // If caret is obscured by on-screen virtual keyboard
      if (caretRect.bottom > vv.height - 40 && typeof window.scrollBy === 'function') {
        window.scrollBy({
          top: caretRect.bottom - (vv.height * 0.45),
          behavior: scrollBehavior,
        });
      }
    };

    const vv = window.visualViewport;
    vv.addEventListener('resize', handleVisualViewportChange);
    vv.addEventListener('scroll', handleVisualViewportChange);

    return () => {
      vv.removeEventListener('resize', handleVisualViewportChange);
      vv.removeEventListener('scroll', handleVisualViewportChange);
    };
  }, [isZenMode, selector, scrollBehavior]);

  // Main automated caret tracking execution (sub-pixel RAF aligned for 120+ FPS)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset scroll at start of session or when rewound
    if (activeCharIndex === 0) {
      isUserScrollingRef.current = false;
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } else {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      updateScrollEdges();
      return;
    }

    // Cancel manual pause on keystroke to resume tracking immediately
    isUserScrollingRef.current = false;

    const rafId = requestAnimationFrame(() => {
      const caretEl = container.querySelector(selector) as HTMLElement | null;
      if (!caretEl) return;

      const containerRect = container.getBoundingClientRect();
      const caretRect = caretEl.getBoundingClientRect();

      if (!caretRect.height) return;

      // ── 1. Vertical Caret Auto-Scroll ──
      const caretRelativeTop = caretRect.top - containerRect.top + container.scrollTop;
      const lineHeight = caretRect.height || 48;
      const anchorOffset = lineHeight * 1.3;
      const targetScrollTop = Math.max(0, caretRelativeTop - anchorOffset);

      // Deadzone threshold (12px) prevents layout thrashing across characters on the same line
      if (Math.abs(targetScrollTop - container.scrollTop) > 12) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({
            top: targetScrollTop,
            behavior: scrollBehavior,
          });
        } else {
          container.scrollTop = targetScrollTop;
        }
      }

      // ── 2. Horizontal Caret Auto-Scroll (for Code Mode / wide indentation) ──
      if (enableHorizontalScroll) {
        const caretRelativeLeft = caretRect.left - containerRect.left + container.scrollLeft;
        const containerWidth = container.clientWidth;

        let targetScrollLeft = container.scrollLeft;
        if (caretRelativeLeft > container.scrollLeft + containerWidth - 60) {
          targetScrollLeft = caretRelativeLeft - containerWidth + 80;
        } else if (caretRelativeLeft < container.scrollLeft + 40) {
          targetScrollLeft = Math.max(0, caretRelativeLeft - 40);
        }

        if (Math.abs(targetScrollLeft - container.scrollLeft) > 8) {
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({
              left: targetScrollLeft,
              behavior: scrollBehavior,
            });
          } else {
            container.scrollLeft = targetScrollLeft;
          }
        }
      }

      // ── 3. Browser Viewport Auto-Scroll ──
      if (enableViewportScroll && !isZenMode && typeof window !== 'undefined') {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const caretScreenBottom = caretRect.bottom;
        const caretScreenTop = caretRect.top;

        if (caretScreenBottom > viewportHeight - 110 && typeof window.scrollBy === 'function') {
          window.scrollBy({
            top: caretScreenBottom - (viewportHeight * 0.45),
            behavior: scrollBehavior,
          });
        } else if (caretScreenTop < 100 && window.scrollY > 0 && typeof window.scrollBy === 'function') {
          window.scrollBy({
            top: caretScreenTop - 160,
            behavior: scrollBehavior,
          });
        }
      }

      updateScrollEdges();
    });

    return () => cancelAnimationFrame(rafId);
  }, [
    activeCharIndex,
    totalLength,
    isZenMode,
    selector,
    enableHorizontalScroll,
    enableViewportScroll,
    scrollBehavior,
    updateScrollEdges,
  ]);

  const scrollToTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, left: 0, behavior: scrollBehavior });
    } else {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
    updateScrollEdges();
  }, [scrollBehavior, updateScrollEdges]);

  const resetScroll = useCallback(() => {
    scrollToTop();
  }, [scrollToTop]);

  // Dynamic edge mask: cleanly fades top/bottom edges only when scrollable content exists
  const maskStyle: React.CSSProperties = useMemo(() => {
    if (canScrollUp && canScrollDown) {
      return {
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
      };
    }
    if (canScrollUp) {
      return {
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black 100%)',
      };
    }
    if (canScrollDown) {
      return {
        maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 16px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 16px), transparent 100%)',
      };
    }
    return {};
  }, [canScrollUp, canScrollDown]);

  return {
    containerRef,
    canScrollUp,
    canScrollDown,
    maskStyle,
    scrollToTop,
    resetScroll,
    updateScrollEdges,
  };
}
