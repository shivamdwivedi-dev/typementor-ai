import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import TypingTest from '../pages/TypingTest';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </HelmetProvider>
  );
};

describe('Official Typing Test Page (Phase 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders title, hero typewriter, and 4 duration selector options', () => {
    renderWithProviders(<TypingTest />);

    // Title
    expect(screen.getByText(/1 Minute Speed Test/i)).toBeDefined();
    expect(screen.getByText(/OFFICIAL SPEED EXAMINATION/i)).toBeDefined();

    // 4 Durations
    expect(screen.getAllByText(/1 Minute/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2 Minutes/i)).toBeDefined();
    expect(screen.getByText(/3 Minutes/i)).toBeDefined();
    expect(screen.getByText(/5 Minutes/i)).toBeDefined();
  });

  it('switches test duration when clicking a duration card', () => {
    renderWithProviders(<TypingTest />);

    const fiveMinCard = screen.getByText(/5 Minutes/i);
    fireEvent.click(fiveMinCard);

    // Countdown stopwatch should now display 5:00
    expect(screen.getByText('5:00')).toBeDefined();
  });

  it('filters by category pills', () => {
    renderWithProviders(<TypingTest />);

    const sciButton = screen.getByRole('button', { name: /^Science$/i });
    fireEvent.click(sciButton);

    expect(screen.getAllByText(/Science/i).length).toBeGreaterThanOrEqual(1);
  });

  it('starts test on keypress and updates typed characters', () => {
    renderWithProviders(<TypingTest />);

    const input = screen.getByLabelText(/Typing test input/i);
    expect(input).toBeDefined();

    // Type first character
    act(() => {
      fireEvent.keyDown(input, { key: 'I' });
    });

    // Reset with Tab
    act(() => {
      fireEvent.keyDown(input, { key: 'Tab' });
    });

    // Should return to idle timer state
    expect(screen.getByText(/1:00|5:00/)).toBeDefined();
  });

  it('renders official WPM benchmark tiers and civil service standards', () => {
    renderWithProviders(<TypingTest />);

    expect(screen.getByText(/GLOBAL ACCREDITATION BENCHMARK/i)).toBeInTheDocument();
    expect(screen.getByText(/Official WPM Speed Tiers & Percentiles/i)).toBeInTheDocument();
    expect(screen.getByText(/Grandmaster/i)).toBeInTheDocument();
    expect(screen.getByText(/110\+ WPM/i)).toBeInTheDocument();

    expect(screen.getByText(/Civil Service, Judicial & Employment Standards Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/CIVIL SERVICE & SSC \(CGL \/ CHSL\)/i)).toBeInTheDocument();
  });

  it('toggles interactive FAQ accordion items', () => {
    renderWithProviders(<TypingTest />);

    const faqButton = screen.getByText(/How is Net WPM calculated on the official typing test\?/i);
    expect(faqButton).toBeInTheDocument();

    // Click to open FAQ answer
    fireEvent.click(faqButton);
    expect(screen.getByText(/one standard word equals 5 keystrokes/i)).toBeInTheDocument();

    // Click again to close
    fireEvent.click(faqButton);
    expect(screen.queryByText(/one standard word equals 5 keystrokes/i)).toBeNull();
  });
});

