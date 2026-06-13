import { describe, it, expect } from 'vitest';

function compileMockLesson(targetKeys: string[], difficulty: number): string {
  const drillSyllables: string[] = [];
  targetKeys.forEach(key => {
    drillSyllables.push(`${key.toLowerCase()}${key.toLowerCase()}`);
  });

  const vocab = ['try', 'tree', 'write', 'third', 'target'];
  const lessonWords: string[] = [...drillSyllables, ...vocab];
  return lessonWords.join(' ');
}

describe('Custom Lesson Drill Builder tests', () => {
  it('should compile syllables targeting weak keys', () => {
    const lessonText = compileMockLesson(['R', 'T'], 1);
    
    // Check if syllable repetitions exist
    expect(lessonText).toContain('rr');
    expect(lessonText).toContain('tt');
  });

  it('should compile vocabulary words', () => {
    const lessonText = compileMockLesson(['R', 'T'], 1);
    
    expect(lessonText).toContain('try');
    expect(lessonText).toContain('write');
  });
});
