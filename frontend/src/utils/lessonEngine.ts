/**
 * Lesson Engine — intelligent lesson selection
 *
 * Responsibilities:
 * 1. Prevent repeating the same prompt twice in a row (ring-buffer dedup)
 * 2. Target weak keys — select prompts heavy in the user's worst keys
 * 3. Provide a large, varied prompt pool per mode
 */

// ── English prompt pool ────────────────────────────────────────────────────────
// 30 prompts across four tiers of difficulty
export const ENGLISH_PROMPTS: { text: string; tier: number; tags: string[] }[] = [
  // Tier 1 — home row heavy, short, common words
  { tier: 1, text: 'the quick brown fox jumps over the lazy dog near the old lake', tags: ['q','x','j','z'] },
  { tier: 1, text: 'all great skills demand daily focused practice and patient effort', tags: ['f','d','s','a'] },
  { tier: 1, text: 'a sad lad had a bad dad and a glad flag on a flat land', tags: ['a','d','l','f'] },
  { tier: 1, text: 'she sells sea shells by the sea shore and the shells are fresh', tags: ['s','h','e','l'] },
  { tier: 1, text: 'big blue birds fly high above bright green hills every single day', tags: ['b','g','i','h'] },
  { tier: 1, text: 'look at the clock and keep your fingers on the home row keys always', tags: ['k','l','o','e'] },

  // Tier 2 — mixed vocab, moderate length
  { tier: 2, text: 'muscle memory builds speed while accurate fingers maintain precision under pressure', tags: ['m','u','r','p'] },
  { tier: 2, text: 'focus on your typing posture and relax your wrists to increase overall consistency', tags: ['f','p','w','c'] },
  { tier: 2, text: 'training your brain to recognize patterns reduces errors and increases your typing speed', tags: ['t','r','n','z'] },
  { tier: 2, text: 'practice every single day for thirty minutes and you will see dramatic improvement', tags: ['p','v','y','m'] },
  { tier: 2, text: 'the rhythm of your keystrokes reveals patterns that identify your unique typing signature', tags: ['r','y','k','g'] },
  { tier: 2, text: 'consistent practice with targeted drills builds lasting muscle memory in your fingers', tags: ['c','b','l','g'] },

  // Tier 3 — complex vocabulary
  { tier: 3, text: 'keystroke telemetry analysis is the foundation of our adaptive typing coach model system', tags: ['k','y','t','x'] },
  { tier: 3, text: 'the cognitive load of simultaneous accuracy and speed monitoring requires disciplined repetition', tags: ['c','g','q','x'] },
  { tier: 3, text: 'quantifying reaction time variability across different key zones helps isolate weak finger transitions', tags: ['q','v','z','x'] },
  { tier: 3, text: 'optimizing your keyboard layout knowledge requires systematic practice of all twenty six alphabets', tags: ['o','z','x','v'] },
  { tier: 3, text: 'the nervous system encodes complex motor patterns through thousands of repetitive deliberate practice hours', tags: ['n','x','v','z'] },
  { tier: 3, text: 'typing proficiency is measured not merely by raw speed but by the quality of each individual keystroke pattern', tags: ['p','q','j','x'] },

  // Tier 4 — technical / mixed punctuation
  { tier: 4, text: 'async function fetchData(url: string): Promise<Response> { return await fetch(url); }', tags: ['<','>','{','}'] },
  { tier: 4, text: 'const results = data.filter(x => x.score >= 90).map(x => ({ id: x.id, grade: "A" }));', tags: ['>','=','.','('] },
  { tier: 4, text: 'SELECT name, AVG(wpm) FROM sessions GROUP BY user_id HAVING AVG(accuracy) > 95 ORDER BY AVG(wpm) DESC;', tags: ['>',';','(','_'] },
  { tier: 4, text: 'interface UserProfile { id: string; wpm: number; accuracy: number; streak: number; level: number; }', tags: ['{','}',';',':'] },
  { tier: 4, text: 'git commit -m "fix: resolve keystroke latency in typing engine and optimize bundle size"', tags: ['"','-',':','_'] },

  // Tier 5 — speed / pure flow
  { tier: 5, text: 'when you push past your comfort zone your fingers build new neural pathways connecting thought to motion', tags: ['z','x','q','v'] },
  { tier: 5, text: 'the extraordinary typist transforms raw keystrokes into seamless expressiveness through years of disciplined mastery', tags: ['x','z','q','v'] },
  { tier: 5, text: 'velocity without accuracy is noise but accuracy without velocity is merely caution dressed up as skill', tags: ['v','x','z','q'] },
  { tier: 5, text: 'the gap between average and expert is not talent but the number of hours spent with deliberate intentional practice', tags: ['q','z','x','j'] },
  { tier: 5, text: 'every correction made during a drill encodes the right pattern one layer deeper into your procedural memory system', tags: ['x','z','j','v'] },
  { tier: 5, text: 'from the moment your fingers touch the keyboard every single character you type is either building or breaking a habit', tags: ['x','z','q','v'] },
];

// ── Session history ring buffer ────────────────────────────────────────────────
const RECENT_SIZE = 5; // never repeat within last 5 sessions
let recentTexts: string[] = [];

function recordSeen(text: string) {
  recentTexts.push(text);
  if (recentTexts.length > RECENT_SIZE) recentTexts.shift();
}

function wasRecentlySeen(text: string): boolean {
  return recentTexts.includes(text);
}

// ── Prompt scoring ─────────────────────────────────────────────────────────────
/**
 * Score a prompt for relevance to the user's weak keys.
 * Higher = more relevant (more occurrences of weak key chars).
 */
function scorePromptForWeakKeys(text: string, weakKeys: string[]): number {
  if (weakKeys.length === 0) return 0;
  const lower = text.toLowerCase();
  return weakKeys.reduce((sum, key) => {
    const count = [...lower].filter(c => c === key.toLowerCase()).length;
    return sum + count;
  }, 0);
}

// ── Main selection function ────────────────────────────────────────────────────
export interface LessonSelection {
  text: string;
  tier: number;
  reason: string; // why this lesson was chosen (shown to user optionally)
}

/**
 * Pick the next English lesson based on:
 * 1. Avoid repeating recently seen prompts
 * 2. Target difficulty tier
 * 3. If weak keys provided, prefer prompts containing those characters
 */
export function selectNextLesson(
  targetDifficulty: number,
  weakKeys: string[] = [],
): LessonSelection {
  const tier = Math.min(5, Math.max(1, targetDifficulty));

  // Gather candidate prompts for this tier (± 1 tier for variety)
  let candidates = ENGLISH_PROMPTS.filter(
    p => p.tier >= tier - 1 && p.tier <= tier + 1 && !wasRecentlySeen(p.text)
  );

  // If all prompts in range were recently seen, widen the pool
  if (candidates.length === 0) {
    candidates = ENGLISH_PROMPTS.filter(p => p.tier >= tier - 1 && p.tier <= tier + 1);
    recentTexts = []; // reset buffer — all seen, start fresh
  }

  // If still empty (shouldn't happen), fall back to all prompts
  if (candidates.length === 0) candidates = ENGLISH_PROMPTS;

  let chosen: typeof ENGLISH_PROMPTS[0];
  let reason: string;

  if (weakKeys.length > 0) {
    // Score candidates by how many weak key characters they contain
    const scored = candidates.map(p => ({
      prompt: p,
      score: scorePromptForWeakKeys(p.text, weakKeys),
    }));
    scored.sort((a, b) => b.score - a.score);

    // 70% chance to pick the highest-scoring (targeted), 30% random for variety
    if (scored[0].score > 0 && Math.random() < 0.7) {
      // Pick from top 3 to add variety
      const top = scored.slice(0, Math.min(3, scored.length));
      chosen = top[Math.floor(Math.random() * top.length)].prompt;
      reason = `Targeted drill for weak keys: ${weakKeys.slice(0, 3).join(', ')}`;
    } else {
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
      reason = `Tier ${tier} general practice`;
    }
  } else {
    chosen = candidates[Math.floor(Math.random() * candidates.length)];
    reason = `Tier ${tier} general practice`;
  }

  recordSeen(chosen.text);

  return {
    text: chosen.text,
    tier: chosen.tier,
    reason,
  };
}

/**
 * Extract the top weak keys from a session's keystroke log.
 * Returns the top N keys by error rate.
 */
export function extractWeakKeys(
  keystrokes: { expectedKey: string; isMistake: boolean }[],
  topN = 4,
): string[] {
  const errors: Record<string, number> = {};
  const total: Record<string, number> = {};

  for (const ks of keystrokes) {
    const k = ks.expectedKey.toUpperCase();
    total[k] = (total[k] ?? 0) + 1;
    if (ks.isMistake) errors[k] = (errors[k] ?? 0) + 1;
  }

  return Object.entries(errors)
    .filter(([k]) => (total[k] ?? 0) >= 2) // min 2 attempts to qualify
    .sort((a, b) => b[1] / (total[b[0]] ?? 1) - a[1] / (total[a[0]] ?? 1))
    .slice(0, topN)
    .map(([k]) => k);
}
