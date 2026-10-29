import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LiquidNavbar, { LiquidNavItem, NimbusIcons } from '../components/LiquidNavbar';

describe('LiquidNavbar Component', () => {
  const testItems: LiquidNavItem[] = [
    { label: 'Academy', href: '/academy', icon: NimbusIcons.academy, fx: 'glow' },
    { label: 'Practice', href: '/practice', icon: NimbusIcons.practice, fx: 'wave' },
    { label: 'Guides', href: '/guides', icon: NimbusIcons.guides, fx: 'drop' },
  ];

  it('renders all nav items with labels and attributes', () => {
    render(<LiquidNavbar items={testItems} active={1} tone="dark" />);

    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-tone')).toBe('dark');

    expect(screen.getByText('Academy')).toBeDefined();
    expect(screen.getByText('Practice')).toBeDefined();
    expect(screen.getByText('Guides')).toBeDefined();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(links[0].getAttribute('aria-current')).toBeNull();
  });

  it('fires onChange callback when an inactive item is clicked', () => {
    const handleChange = vi.fn();
    render(<LiquidNavbar items={testItems} active={0} onChange={handleChange} />);

    const practiceLink = screen.getByText('Practice');
    fireEvent.click(practiceLink);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(1, testItems[1]);
  });

  it('supports button items without href', () => {
    const buttonItems: LiquidNavItem[] = [
      { label: 'Tab 1', icon: NimbusIcons.home },
      { label: 'Tab 2', icon: NimbusIcons.globe },
    ];
    const handleChange = vi.fn();
    render(<LiquidNavbar items={buttonItems} active={0} onChange={handleChange} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]);
    expect(handleChange).toHaveBeenCalledWith(1, buttonItems[1]);
  });
});
