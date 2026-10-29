import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { getPromptForWordCount } from '../utils/lessonEngine';
import { generateEndurancePassage } from '../utils/endurancePassages';
import TypingEngine from '../components/TypingEngine';
import { useTypingStore } from '../store/TypingStore';

describe('Monkeytype Practice Engine', () => {
  it('generates exact word count prompts for 15, 25, 50, and 100 words', () => {
    const prompt15 = getPromptForWordCount(15, 1);
    expect(prompt15.text.trim().split(/\s+/).length).toBe(15);

    const prompt25 = getPromptForWordCount(25, 1);
    expect(prompt25.text.trim().split(/\s+/).length).toBe(25);

    const prompt50 = getPromptForWordCount(50, 2);
    expect(prompt50.text.trim().split(/\s+/).length).toBe(50);

    const prompt100 = getPromptForWordCount(100, 3);
    expect(prompt100.text.trim().split(/\s+/).length).toBe(100);
  });

  it('preserves words without inserting unparsed characters', () => {
    const prompt = getPromptForWordCount(25, 1);
    expect(prompt.text).not.toContain('␣');
    expect(prompt.text.length).toBeGreaterThan(50);
  });

  it('generates endurance passages with clean characters and no glyph corruption', () => {
    const endurance = generateEndurancePassage('Technology', 200, []);
    expect(endurance.text).not.toContain('␣');
    expect(endurance.text.length).toBeGreaterThan(500);
    expect(endurance.idsUsed.length).toBeGreaterThan(0);
  });

  it('renders a scrollable viewport container with data-caret tracking for multi-line tests', () => {
    const prompt100 = getPromptForWordCount(100, 2);
    useTypingStore.getState().initializeSession(prompt100.text, 'English', 2);

    const { container } = render(<TypingEngine />);
    
    // Viewport scroll container with no-scrollbar styling
    const scrollContainer = container.querySelector('.no-scrollbar');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.classList.contains('overflow-y-auto')).toBe(true);

    // Initial caret at character 0
    const activeCaret = container.querySelector('[data-caret="true"]');
    expect(activeCaret).toBeInTheDocument();
  });
});
