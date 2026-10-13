import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes, {
  routeLoaders,
  hasPreloadedAuthenticatedRoutes,
  resetRoutePreloadForTests,
} from '../AppRoutes';
import { useAuthStore } from '../store/AuthStore';

describe('Route Preloading Restrictions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRoutePreloadForTests();
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does NOT preload Practice, Academy, or Dashboard when visiting public routes while unauthenticated', () => {
    const practiceSpy = vi.spyOn(routeLoaders, 'loadPracticeBoard');
    const academySpy = vi.spyOn(routeLoaders, 'loadTypingAcademy');
    const dashboardSpy = vi.spyOn(routeLoaders, 'loadDashboard');

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(hasPreloadedAuthenticatedRoutes()).toBe(false);
    expect(practiceSpy).not.toHaveBeenCalled();
    expect(academySpy).not.toHaveBeenCalled();
    expect(dashboardSpy).not.toHaveBeenCalled();
  });

  it('preloads authenticated app modules only after authenticated session becomes active', () => {
    const practiceSpy = vi.spyOn(routeLoaders, 'loadPracticeBoard').mockResolvedValue({ default: () => null } as any);
    const academySpy = vi.spyOn(routeLoaders, 'loadTypingAcademy').mockResolvedValue({ default: () => null } as any);
    const dashboardSpy = vi.spyOn(routeLoaders, 'loadDashboard').mockResolvedValue({ default: () => null } as any);

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(hasPreloadedAuthenticatedRoutes()).toBe(false);

    // 1. Activate authenticated session and flush React effect
    act(() => {
      useAuthStore.setState({ isAuthenticated: true });
    });

    // 2. Advance idle timer scheduled by the effect
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(hasPreloadedAuthenticatedRoutes()).toBe(true);
    expect(practiceSpy).toHaveBeenCalled();
    expect(academySpy).toHaveBeenCalled();
    expect(dashboardSpy).toHaveBeenCalled();
  });
});
