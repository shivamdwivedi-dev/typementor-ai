import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTypingTestPassage,
  getSeenPassagesCount,
  resetSeenPassages,
  recordSeenPassage,
  getAvailableCategories,
  TEST_PASSAGE_LIBRARY,
} from '../utils/typingTestPassages';

describe('Typing Test Passage Combinatorial Engine (Phase 1)', () => {
  beforeEach(() => {
    resetSeenPassages();
    localStorage.clear();
  });

  it('provides a rich library with across all 6 core categories', () => {
    const categories = getAvailableCategories();
    expect(categories).toContain('Literature');
    expect(categories).toContain('Science');
    expect(categories).toContain('Technology');
    expect(categories).toContain('History');
    expect(categories).toContain('Philosophy');
    expect(categories).toContain('Wonders');
    expect(TEST_PASSAGE_LIBRARY.length).toBeGreaterThan(25);
  });

  it('generates a 1-minute test passage with target word count (~60-90 words)', () => {
    const passage = getTypingTestPassage({ durationMinutes: 1, category: 'Literature' });
    expect(passage).toBeDefined();
    expect(passage.text.length).toBeGreaterThan(100);
    expect(passage.wordCount).toBeGreaterThanOrEqual(40);
    expect(passage.durationMinutes).toBe(1);
    expect(passage.segmentIds.length).toBeGreaterThanOrEqual(1);
  });

  it('generates a 5-minute continuous stitched passage (~350+ words) without duplicates', () => {
    const passage = getTypingTestPassage({ durationMinutes: 5, category: 'Random' });
    expect(passage).toBeDefined();
    expect(passage.wordCount).toBeGreaterThanOrEqual(250);
    expect(passage.durationMinutes).toBe(5);
    expect(passage.segmentIds.length).toBeGreaterThan(1);

    // Ensure all stitched segments are unique within this passage
    const uniqueIds = new Set(passage.segmentIds);
    expect(uniqueIds.size).toBe(passage.segmentIds.length);
  });

  it('enforces 50-session FIFO anti-repeat memory so consecutive tests do not repeat', () => {
    const firstRun = getTypingTestPassage({ durationMinutes: 1, category: 'Philosophy' });
    const firstId = firstRun.segmentIds[0];

    expect(getSeenPassagesCount()).toBeGreaterThan(0);

    // Next run must not choose the exact same primary seed segment
    const secondRun = getTypingTestPassage({ durationMinutes: 1, category: 'Philosophy' });
    expect(secondRun.segmentIds[0]).not.toBe(firstId);
  });

  it('manages FIFO queue capacity and cycling safely', () => {
    for (let i = 0; i < 60; i++) {
      recordSeenPassage(`test_segment_${i}`);
    }
    // Max capacity capped at 50
    expect(getSeenPassagesCount()).toBe(50);
  });
});
