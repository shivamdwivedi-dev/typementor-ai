import {
  DifficultyTier,
  ConquestPassage,
  PassageMetrics,
} from './conquest.types';

/**
 * Calculates deterministic, measurable lexical properties of typing text.
 * Avoids subjective grading by measuring word count, character density,
 * mean word length, and punctuation frequency.
 */
export function calculatePassageMetrics(text: string): PassageMetrics {
  const clean = text.trim();
  if (clean.length === 0) {
    return {
      wordCount: 0,
      charCount: 0,
      averageWordLength: 0,
      punctuationCount: 0,
    };
  }

  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const charCount = text.length;

  const totalWordChars = words.reduce((sum, word) => {
    // Strip common punctuation when computing raw lexical word length
    const lettersOnly = word.replace(/^[.,;:!?'"()\-—]+|[.,;:!?'"()\-—]+$/g, '');
    return sum + (lettersOnly.length > 0 ? lettersOnly.length : word.length);
  }, 0);

  const averageWordLength =
    wordCount > 0 ? Number((totalWordChars / wordCount).toFixed(2)) : 0;

  const punctuationMatches = text.match(/[.,;:!?'"()\-—/]/g);
  const punctuationCount = punctuationMatches ? punctuationMatches.length : 0;

  return {
    wordCount,
    charCount,
    averageWordLength,
    punctuationCount,
  };
}

function createPassage(
  id: string,
  title: string,
  tier: DifficultyTier,
  text: string
): ConquestPassage {
  const metrics = calculatePassageMetrics(text);
  return {
    id,
    title,
    tier,
    text,
    ...metrics,
  };
}

/**
 * Curated Conquest Passage Library
 * Tier 1 (EASY / NEUTRAL): ~25-35 words, basic syntax, lower punctuation density.
 * Tier 2 (MEDIUM / FORTRESS): ~45-55 words, defensive/architectural themes, moderate punctuation.
 * Tier 3 (HARD / ENEMY_TERRITORY): ~60-75 words, distributed systems & algorithms, complex punctuation.
 * Tier 4 (EXPERT / ENEMY_CAPITAL): ~80-105 words, high lexical density, sophisticated phrasing.
 */
export const CONQUEST_PASSAGES: readonly ConquestPassage[] = Object.freeze([
  // ─── TIER 1: EASY (NEUTRAL TERRITORY) ──────────────────────────────────
  createPassage(
    'passage_cq_easy_01',
    'Continuous Flow',
    'EASY',
    'Speed in typing comes not from rushing your fingers, but from smooth rhythm and steady cadence. When your mind anticipates the next keystroke, muscle memory carries you forward without hesitation.'
  ),
  createPassage(
    'passage_cq_easy_02',
    'Clean Architecture',
    'EASY',
    'Clean code always looks like it was written by someone who cares. Simple functions, descriptive variable names, and clear separation of concerns make software resilient to change and effortless to debug.'
  ),
  createPassage(
    'passage_cq_easy_03',
    'Daily Practice',
    'EASY',
    'Small improvements accumulated daily create extraordinary results over time. Ten minutes of focused practice each morning will steadily sharpen your typing precision, reaction speed, and cognitive endurance.'
  ),
  createPassage(
    'passage_cq_easy_04',
    'Focused Mind',
    'EASY',
    'Clear thinking always produces concise code. When you sit before the terminal, release unnecessary distractions and focus your attention on solving the immediate problem with calm and steady discipline.'
  ),
  createPassage(
    'passage_cq_easy_05',
    'Binary Foundation',
    'EASY',
    'Every modern computer system operates upon fundamental binary logic. Simple electronic switches alternate between presence and absence of voltage, giving rise to all digital commerce and computational networks.'
  ),

  // ─── TIER 2: MEDIUM (FORTRESS DEFENSE) ─────────────────────────────────
  createPassage(
    'passage_cq_med_01',
    'Defensive Architecture',
    'MEDIUM',
    'Resilient software design assumes that component failures will inevitably occur. By establishing circuit breakers, strict request timeouts, and decoupled fallback paths, modern microservices withstand intense network turbulence without crashing. Isolating critical subsystems preserves core business availability during unexpected service degradation.'
  ),
  createPassage(
    'passage_cq_med_02',
    'The Unix Philosophy',
    'MEDIUM',
    'The foundational philosophy of Unix emphasizes building small, modular programs that perform exactly one task with exquisite perfection. By combining these independent utilities through universal text streams, developers create astonishingly powerful computing pipelines without writing bespoke monolithic applications. Simplicity and composability remain enduring engineering principles.'
  ),
  createPassage(
    'passage_cq_med_03',
    'Algorithmic Efficiency',
    'MEDIUM',
    'Choosing the appropriate data structure frequently matters far more than micro-optimizing low-level code instructions. A balanced hash table provides constant time lookups, whereas an unindexed linear scan slows down dramatically as datasets expand. Engineering high-throughput software requires an intuitive grasp of algorithmic time and space complexity.'
  ),
  createPassage(
    'passage_cq_med_04',
    'Zero Trust Bastion',
    'MEDIUM',
    'Modern network security deploys layered defense zones rather than trusting a single perimeter boundary. Zero trust architecture mandates continuous identity verification, mutual cryptographic validation, and least privilege access controls across every internal API route. Defending sensitive infrastructure requires immutable audit trails and automated threat containment.'
  ),
  createPassage(
    'passage_cq_med_05',
    'Cache Invalidation',
    'MEDIUM',
    'Effective memory caching dramatically reduces database query pressure, yet data consistency remains an intricate engineering challenge. Stale cached state can silently corrupt user workflows unless invalidation mechanisms react instantly to database mutations. Designing resilient caches requires deterministic eviction policies, idempotent updates, and bounded temporal expiration.'
  ),

  // ─── TIER 3: HARD (ENEMY TERRITORY RECONQUEST) ──────────────────────────
  createPassage(
    'passage_cq_hard_01',
    'Distributed Systems at Scale',
    'HARD',
    'Distributed systems achieve massive throughput by breaking monolithic workloads into independent, asynchronous micro-tasks. Event loops, message queues, and non-blocking input-output operations enable a single lightweight server to gracefully coordinate hundreds of thousands of concurrent network connections. The true secret of horizontal scalability is avoiding shared mutable state and embracing idempotent message delivery across resilient, geographically replicated server clusters.'
  ),
  createPassage(
    'passage_cq_hard_02',
    'The Modern Browser Engine',
    'HARD',
    'Modern web browsers are miniature operating systems, orchestrating network requests, parsing complex document trees, and executing just-in-time compiled code at lightning speed. Behind every smooth visual transition lies a sophisticated rendering pipeline of layout calculation, compositing, and GPU acceleration. Understanding how the browser paints pixels transforms ordinary coders into world-class performance engineers who command complete mastery over user interfaces.'
  ),
  createPassage(
    'passage_cq_hard_03',
    'Compiler Optimization Pipelines',
    'HARD',
    'Compilers translate abstract human logic into raw machine instructions through an intricate multi-stage pipeline. Lexical analysis tokenizes characters; syntactic parsers construct abstract syntax trees; and semantic analyzers verify type consistency. Finally, aggressive optimization passes eliminate redundant operations, vectorize computational loops, and emit efficient assembly instructions that extract maximum performance from modern superscalar microprocessor architectures.'
  ),
  createPassage(
    'passage_cq_hard_04',
    'Transactional Database Isolation',
    'HARD',
    'Relational databases uphold strict consistency guarantees through isolation levels that balance concurrency against transactional anomalies. Read committed isolation prevents dirty reads, while serializable isolation provides full protection against write skew and phantom phenomena. Achieving optimal database throughput under heavy multi-user write contention requires deep understanding of pessimistic row locks, multi-version concurrency control, and deadlock detection algorithms.'
  ),
  createPassage(
    'passage_cq_hard_05',
    'Reactive Stream Orchestration',
    'HARD',
    'Asynchronous stream processing treats data as continuous temporal sequences rather than static in-memory collections. Backpressure mechanisms allow downstream consumers to signal capacity limits to upstream producers, preventing buffer overflows during sudden traffic spikes. Mastering reactive event handling enables developers to construct responsive, fault-tolerant telemetry pipelines that process millions of events per second without dropping packets.'
  ),

  // ─── TIER 4: EXPERT (ENEMY CAPITAL ASSAULT) ─────────────────────────────
  createPassage(
    'passage_cq_expert_01',
    'The Citadel of Artificial Intellect',
    'EXPERT',
    'Artificial intelligence is fundamentally reshaping human civilization, transitioning computer science from manual algorithmic specification toward probabilistic learning systems. Modern neural networks synthesize vast corpora of human knowledge, providing instant conversational insights and accelerating engineering workflows across every scientific discipline. Yet, the indispensable core of human craftsmanship remains irreplaceable: critical judgment, ethical empathy, rigorous architectural alignment, and the rare ability to articulate deep questions that guide synthetic intellect toward meaningful outcomes for all humanity. As machine autonomy expands, software architects must cultivate greater intellectual discernment to ensure these powerful engines serve democratic prosperity.'
  ),
  createPassage(
    'passage_cq_expert_02',
    'The Architecture of Mastery',
    'EXPERT',
    'True mastery in any intellectual discipline requires deliberate practice, intense focus, and an uncompromising dedication to continuous refinement. In the high-velocity arena of professional typing, absolute precision must always precede raw velocity: each finger must reliably discover its home key with effortless muscle memory before speed can safely flourish. As conscious physical exertion dissolves into subconscious reflex, the mechanical keyboard ceases to be an external instrument; it becomes a direct, frictionless extension of your thoughts, transforming abstract ideas into reality at the speed of human imagination.'
  ),
  createPassage(
    'passage_cq_expert_03',
    'The Engineering of Planetary Resilience',
    'EXPERT',
    'Building mission-critical distributed infrastructure is an unending exercise in managing chaotic failure modes across unreliable physical networks. Hardware components will degrade, transoceanic fiber cables will be severed, and cosmic radiation will occasionally flip bits in memory. The triumph of resilient software engineering lies in designing self-healing protocols—consensus algorithms like Raft, gossiping peer-to-peer topologies, and automated failover mechanics—that maintain unwavering transactional integrity even when three-quarters of the underlying cluster collapses without warning. True operational excellence embraces chaos engineering, proactively injecting randomized faults into production systems to guarantee that when real catastrophes strike, the platform sustains continuous user service without data loss.'
  ),
  createPassage(
    'passage_cq_expert_04',
    'The Philosophy of Universal Computation',
    'EXPERT',
    'From Alan Turing\'s conceptual paper tape to contemporary quantum state manipulation, computation remains one of humanity\'s most profound philosophical explorations. We have constructed universal calculating engines out of silicon, light, and mathematical formalisms, capable of simulating cosmic galaxies or deciphering the molecular choreography of life itself. To write software is to participate in this grand intellectual lineage: every function you author is a miniature universe governed by immutable laws of your own making, reflecting the inexhaustible human drive to comprehend and reshape reality. Every keystroke contributes to an ever-expanding computational tapestry that binds human intellect with mechanical execution.'
  ),
  createPassage(
    'passage_cq_expert_05',
    'The Symphony of Asynchronous Concurrency',
    'EXPERT',
    'Orchestrating massively parallel architectures demands mastery over time, memory barriers, and synchronization primitives. Mutexes, semaphores, and lock-free atomic registers coordinate concurrent threads competing for finite hardware resources. When thousands of lightweight virtual threads interleave non-deterministic execution paths, even minor race conditions can trigger elusive memory corruptions. Elevating software from functional code to a high-performance computational masterpiece requires mathematically verified invariants, formal state modeling, and unflinching algorithmic discipline. Engineers who navigate these concurrent currents build digital foundations that reliably sustain modern real-time civilization.'
  ),
]);

/**
 * Built-in Emergency Fallback Passage used when a custom or external passage
 * pool is empty or corrupted, ensuring deterministic zero-crash resilience.
 */
export const EMERGENCY_FALLBACK_PASSAGE: ConquestPassage = Object.freeze({
  id: 'passage_cq_emergency_fallback',
  title: 'Standard Typing Skirmish',
  tier: 'EASY',
  text: 'Precision and focus guide every successful keystroke. Master your rhythm, breathe steadily, and strike with absolute certainty.',
  wordCount: 18,
  charCount: 122,
  averageWordLength: 5.83,
  punctuationCount: 3,
});
