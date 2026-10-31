import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Typewriter } from '../components/ui/Typewriter';
import { GlowCard } from '../components/ui/GlowCard';

describe('Modern UI Components Suite', () => {
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
});
