import { describe, it, expect } from 'vitest';
import { getPromptForWordCount } from '../utils/lessonEngine';

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
});
