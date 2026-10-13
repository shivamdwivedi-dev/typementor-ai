import { useEffect } from 'react';

let activeLockCount = 0;
let previousOverflow: string | null = null;

/**
 * Reference-counted body scroll lock.
 * Prevents one modal/drawer from unlocking document.body scroll while another overlay remains open.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (activeLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeLockCount += 1;

  let released = false;
  return () => {
    if (released || typeof document === 'undefined') return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      document.body.style.overflow = previousOverflow ?? '';
      previousOverflow = null;
    }
  };
}

export function getActiveScrollLockCount(): number {
  return activeLockCount;
}

export function resetScrollLocksForTests(): void {
  activeLockCount = 0;
  previousOverflow = null;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
}

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    const unlock = lockBodyScroll();
    return unlock;
  }, [isLocked]);
}
