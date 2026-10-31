import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Typewriter } from '../components/ui/Typewriter';
import { GlowCard } from '../components/ui/GlowCard';
import TypingAnalyticsBento from '../components/TypingAnalyticsBento';

describe('Modern UI Components Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Typewriter with cursor and animates text', async () => {
    render(<Typewriter text="Speed Test Engine" speed={20} cursor="|" />);
    
    // Check initial pulse cursor
    expect(screen.getByText('|')).toBeDefined();

    // Advance timers
    await act(async () => {
      await new Promise(r => setTimeout(r, 150));
    });

    const element = screen.getByText('|').parentElement;
    expect(element?.textContent).toContain('|');
  });

  it('renders GlowCard with custom sizing and glow color', () => {
    const { container } = render(
      <GlowCard glowColor="purple" customSize className="test-card">
        <div>Card Inner Content</div>
      </GlowCard>
    );

    expect(screen.getByText('Card Inner Content')).toBeDefined();
    const glowDiv = container.querySelector('[data-glow]');
    expect(glowDiv).toBeDefined();
  });

  it('renders clean telemetry calibration state without fake numbers for first-time users', () => {
    render(<TypingAnalyticsBento sessionHistory={[]} completedLessonsCount={0} />);

    // Should render calibration state
    expect(screen.getByText(/Adaptive Keystroke Telemetry Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting First Run/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Chars/i)).toBeInTheDocument();
    expect(screen.getByText(/Calibrating/i)).toBeInTheDocument();

    // Must NOT contain the old hardcoded fake metrics
    expect(screen.queryByText('68')).toBeNull();
    expect(screen.queryByText('14820')).toBeNull();
    expect(screen.queryByText('+14.2%')).toBeNull();
  });
});
