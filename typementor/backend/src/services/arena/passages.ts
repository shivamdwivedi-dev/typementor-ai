export interface ArenaPassage {
  id: string;
  title: string;
  category: 'Short' | 'Standard' | 'Long';
  text: string;
  wordCount: number;
}

export const ARENA_PASSAGES: ArenaPassage[] = [
  // Short (~35-45 words)
  {
    id: 'passage_s1',
    title: 'Clean Architecture',
    category: 'Short',
    text: 'Clean code always looks like it was written by someone who cares. Simple functions, descriptive variable names, and clear separation of concerns make software resilient to change and effortless to debug.',
    wordCount: 30,
  },
  {
    id: 'passage_s2',
    title: 'The Art of Debugging',
    category: 'Short',
    text: 'Debugging is twice as hard as writing the code in the first place. Therefore, if you write code as cleverly as possible, you are by definition not smart enough to debug it.',
    wordCount: 31,
  },
  {
    id: 'passage_s3',
    title: 'Continuous Flow',
    category: 'Short',
    text: 'Speed in typing comes not from rushing your fingers, but from smooth rhythm and steady cadence. When your mind anticipates the next keystroke, muscle memory carries you forward without hesitation.',
    wordCount: 29,
  },

  // Standard (~65-80 words)
  {
    id: 'passage_m1',
    title: 'The Modern Web Engine',
    category: 'Standard',
    text: 'Modern web browsers are miniature operating systems, orchestrating network requests, parsing document trees, and executing just-in-time compiled JavaScript at lightning speed. Behind every smooth visual transition lies a sophisticated rendering pipeline of layout calculation, compositing, and GPU acceleration. Understanding how browsers paint pixels transforms ordinary coders into world-class web performance engineers.',
    wordCount: 52,
  },
  {
    id: 'passage_m2',
    title: 'Concurrency and Scale',
    category: 'Standard',
    text: 'Distributed systems achieve massive throughput by breaking monolithic workloads into independent, asynchronous micro-tasks. Event loops, message queues, and non-blocking I/O enable a single lightweight server to gracefully coordinate hundreds of thousands of concurrent network connections. The true secret of horizontal scalability is avoiding shared mutable state and embracing idempotent message delivery across resilient clusters.',
    wordCount: 53,
  },
  {
    id: 'passage_m3',
    title: 'The Unix Philosophy',
    category: 'Standard',
    text: 'The foundational philosophy of Unix emphasizes building small, modular programs that perform exactly one task with exquisite perfection. By combining these independent utilities through universal text streams, developers create astonishingly powerful computing pipelines without writing bespoke monolithic applications. Simplicity, clarity, and composability remain the enduring cornerstones of elegant software engineering.',
    wordCount: 49,
  },

  // Long (~100-130 words)
  {
    id: 'passage_l1',
    title: 'The Future of Artificial Intelligence',
    category: 'Long',
    text: 'Artificial intelligence is fundamentally reshaping the software industry, transitioning engineering from manual algorithmic imperative specification toward probabilistic learning systems. Modern neural networks synthesize vast corpora of human knowledge, providing instant conversational insights and accelerating developer workflows. Yet, the indispensable core of human craftsmanship remains irreplaceable: critical judgment, empathy, ethical alignment, and the ability to articulate deep questions that guide synthetic intellect toward meaningful outcomes for all of humanity.',
    wordCount: 68,
  },
  {
    id: 'passage_l2',
    title: 'Mastery and Focus',
    category: 'Long',
    text: 'True mastery in any discipline requires deliberate practice, deep focus, and an uncompromising dedication to continuous refinement. In touch typing, precision precedes velocity; each finger must reliably discover its home key with effortless muscle memory. As conscious physical effort dissolves into subconscious instinct, the keyboard transforms from an obstacle into a direct, frictionless extension of your thoughts.',
    wordCount: 57,
  },
];

export function getRandomArenaPassage(category?: string): ArenaPassage {
  let candidates = ARENA_PASSAGES;
  if (category) {
    const matched = ARENA_PASSAGES.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    if (matched.length > 0) candidates = matched;
  }
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}

export function getPassageById(passageId: string): ArenaPassage | undefined {
  return ARENA_PASSAGES.find((p) => p.id === passageId);
}
