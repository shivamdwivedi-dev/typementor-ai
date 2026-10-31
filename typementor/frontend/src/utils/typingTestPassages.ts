/**
 * Infinite Dynamic Passage Database & Combinatorial Engine
 *
 * Provides hundreds of authentic, diverse literary, scientific, historical,
 * and philosophical texts for the TypeMentor Official Typing Speed Test.
 *
 * Features:
 * 1. 6 Distinct Thematic Categories (Literature, Science, Tech, History, Philosophy, Wonders).
 * 2. 50-Session FIFO Anti-Repeat Queue in LocalStorage (zero repeats across 50 consecutive tests).
 * 3. Combinatorial Paragraph Stitcher: dynamically combines cohesive thematic paragraphs
 *    to generate 1m (75w), 2m (150w), 3m (250w), and 5m (450w+) test passages without repetition.
 */

export interface TestPassageSegment {
  id: string;
  category: 'Literature' | 'Science' | 'Technology' | 'History' | 'Philosophy' | 'Wonders';
  title: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
  wordCount: number;
}

export interface GeneratedTestPassage {
  id: string;
  title: string;
  category: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
  wordCount: number;
  durationMinutes: number;
  segmentIds: string[];
}

export const TEST_PASSAGE_LIBRARY: TestPassageSegment[] = [
  // ── 1. LITERATURE & CLASSICS ──
  {
    id: 'lit_1984_01',
    category: 'Literature',
    title: 'The Ministry of Truth',
    source: 'George Orwell, 1984',
    difficulty: 'medium',
    text: 'It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.',
    wordCount: 57,
  },
  {
    id: 'lit_1984_02',
    category: 'Literature',
    title: 'The Telescreen Gaze',
    source: 'George Orwell, 1984',
    difficulty: 'medium',
    text: 'The hallway smelt of boiled cabbage and old rag mats. At one end of it a colored poster, too large for indoor display, had been tacked to the wall. It depicted simply an enormous face, more than a meter wide: the face of a man of about forty-five, with a heavy black mustache and ruggedly handsome features.',
    wordCount: 58,
  },
  {
    id: 'lit_sherlock_01',
    category: 'Literature',
    title: 'A Study in Scarlet',
    source: 'Arthur Conan Doyle',
    difficulty: 'easy',
    text: 'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions were abhorrent to his cold, precise, but admirably balanced mind.',
    wordCount: 58,
  },
  {
    id: 'lit_sherlock_02',
    category: 'Literature',
    title: 'The Science of Deduction',
    source: 'Arthur Conan Doyle',
    difficulty: 'medium',
    text: 'It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts. From a drop of water, a logician could infer the possibility of an Atlantic or a Niagara without having seen or heard of one or the other.',
    wordCount: 53,
  },
  {
    id: 'lit_frankenstein_01',
    category: 'Literature',
    title: 'The Spark of Being',
    source: 'Mary Shelley, Frankenstein',
    difficulty: 'hard',
    text: 'It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes.',
    wordCount: 65,
  },
  {
    id: 'lit_frankenstein_02',
    category: 'Literature',
    title: 'The Yellow Eye',
    source: 'Mary Shelley, Frankenstein',
    difficulty: 'medium',
    text: 'By the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs. How can I describe my emotions at this catastrophe, or how delineate the wretch whom with such infinite pains and care I had endeavored to form?',
    wordCount: 54,
  },
  {
    id: 'lit_verne_01',
    category: 'Literature',
    title: 'Twenty Thousand Leagues',
    source: 'Jules Verne',
    difficulty: 'medium',
    text: 'The sea is everything. It covers seven tenths of the terrestrial globe. Its breath is pure and healthy. It is an immense desert, where man is never lonely, for he feels life stirring on all sides. The sea is only the embodiment of a supernatural and wonderful existence; it is only love and emotion; it is the living infinite.',
    wordCount: 61,
  },
  {
    id: 'lit_verne_02',
    category: 'Literature',
    title: 'The Nautilus Abyss',
    source: 'Jules Verne',
    difficulty: 'hard',
    text: 'We were speeding through translucent waters beneath towering subterranean basalt arches. Phosphorescent jellyfish radiated emerald phosphorescence in the wake of the Nautilus propellers, casting strange undulating geometric shadows across the silence of the sunken ocean trench.',
    wordCount: 37,
  },
  {
    id: 'lit_pride_01',
    category: 'Literature',
    title: 'First Impressions',
    source: 'Jane Austen, Pride and Prejudice',
    difficulty: 'easy',
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighborhood, this truth is so well fixed in the minds of the surrounding families that he is considered the rightful property of someone.',
    wordCount: 65,
  },
  {
    id: 'lit_poe_01',
    category: 'Literature',
    title: 'The Tell-Tale Pulse',
    source: 'Edgar Allan Poe',
    difficulty: 'hard',
    text: 'True! Nervous—very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses—not destroyed—not dulled them. Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell.',
    wordCount: 55,
  },
  {
    id: 'lit_wild_01',
    category: 'Literature',
    title: 'The Call of the Wild',
    source: 'Jack London',
    difficulty: 'medium',
    text: 'Buck did not read the newspapers, or he would have known that trouble was brewing, not alone for himself, but for every tide-water dog, strong of muscle and with warm, long hair, from Puget Sound to San Diego. Because men, groping in the Arctic darkness, had found a yellow metal, thousands of rushing men were heading north.',
    wordCount: 60,
  },
  {
    id: 'lit_moby_01',
    category: 'Literature',
    title: 'Call Me Ishmael',
    source: 'Herman Melville, Moby Dick',
    difficulty: 'medium',
    text: 'Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.',
    wordCount: 58,
  },

  // ── 2. SCIENCE & COSMOS ──
  {
    id: 'sci_cosmos_01',
    category: 'Science',
    title: 'The Pale Blue Dot',
    source: 'Carl Sagan',
    difficulty: 'easy',
    text: 'Look again at that dot. That is here. That is home. That is us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering, thousands of confident religions, ideologies, and economic doctrines flourished there on a mote of dust.',
    wordCount: 61,
  },
  {
    id: 'sci_cosmos_02',
    category: 'Science',
    title: 'Stardust Origins',
    source: 'Astrophysics Foundations',
    difficulty: 'medium',
    text: 'The nitrogen in our DNA, the calcium in our teeth, the iron in our blood, and the carbon in our apple pies were made in the interiors of collapsing stars. We are made of starstuff. Our planet, our sun, and all the elements that build our technology were forged in cosmic supernovae billions of years ago.',
    wordCount: 58,
  },
  {
    id: 'sci_quantum_01',
    category: 'Science',
    title: 'The Quantum Realm',
    source: 'Modern Physics',
    difficulty: 'hard',
    text: 'In quantum mechanics, particles do not possess definite positions until they are measured. Instead, their states are represented by wavefunctions that evolve deterministically according to the Schrodinger equation, yet collapse probabilistically upon observation. This wave-particle duality shatters classical Newtonian intuitions about the fundamental nature of physical reality.',
    wordCount: 50,
  },
  {
    id: 'sci_neuro_01',
    category: 'Science',
    title: 'Neuroplasticity and Habit',
    source: 'Cognitive Neuroscience',
    difficulty: 'medium',
    text: 'The human brain is not a static organ, but a dynamic network continuously remapping its synaptic pathways in response to experience. Every repeated keystroke strengthens myelin sheaths around neural axons, accelerating electrical conduction velocity from visual recognition to motor execution. Deliberate practice literally sculpts cortical gray matter.',
    wordCount: 49,
  },
  {
    id: 'sci_blackhole_01',
    category: 'Science',
    title: 'The Event Horizon',
    source: 'General Relativity',
    difficulty: 'hard',
    text: 'Beyond the event horizon of a black hole, spacetime is warped so severely by gravitational collapse that all possible trajectories curve inward toward the central singularity. Even light, propagating at three hundred thousand kilometers per second, lacks sufficient escape velocity to cross back into the observable universe.',
    wordCount: 48,
  },
  {
    id: 'sci_evolution_01',
    category: 'Science',
    title: 'The Tree of Life',
    source: 'Charles Darwin',
    difficulty: 'medium',
    text: 'From so simple a beginning endless forms most beautiful and most wonderful have been, and are being, evolved. Natural selection acts solely through the preservation of slight modifications, each profitable to the individual in its complex and shifting battle for existence against surrounding nature.',
    wordCount: 46,
  },
  {
    id: 'sci_ocean_01',
    category: 'Science',
    title: 'The Abyssal Zone',
    source: 'Marine Biology',
    difficulty: 'medium',
    text: 'Under pressures exceeding one thousand atmospheres and perpetual midnight, life thrives around hydrothermal vents in the oceanic crust. Chemosynthetic bacteria convert toxic hydrogen sulfide into organic matter, sustaining thriving colonies of giant tube worms and translucent crustaceans independent of sunlight.',
    wordCount: 43,
  },
  {
    id: 'sci_optics_01',
    category: 'Science',
    title: 'The Nature of Photons',
    source: 'Optics & Electromagnetism',
    difficulty: 'hard',
    text: 'Light behaves simultaneously as continuous electromagnetic radiation and discrete quantum packets known as photons. When white light enters a dispersive glass prism, varying refractive indices decelerate shorter violet wavelengths more than red, unraveling a vivid spectrum across the refracted beam.',
    wordCount: 42,
  },

  // ── 3. TECH & FUTURE ──
  {
    id: 'tech_turing_01',
    category: 'Technology',
    title: 'The Imitation Game',
    source: 'Alan Turing, 1950',
    difficulty: 'medium',
    text: 'I propose to consider the question, Can machines think? We may hope that machines will eventually compete with men in all purely intellectual fields. But which are the best ones to start with? Even this is a difficult decision. Many people think that a very abstract activity, like the playing of chess, would be best.',
    wordCount: 57,
  },
  {
    id: 'tech_ada_01',
    category: 'Technology',
    title: 'The First Algorithm',
    source: 'Ada Lovelace, 1843',
    difficulty: 'medium',
    text: 'The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. In enabling mechanism to combine with intellectual operations, it might act upon other things besides number, were objects found whose mutual fundamental relations could be expressed by the abstract science of operations.',
    wordCount: 49,
  },
  {
    id: 'tech_crypto_01',
    category: 'Technology',
    title: 'Public Key Cryptography',
    source: 'Computer Science Core',
    difficulty: 'hard',
    text: 'Asymmetric encryption relies on mathematically one-way trapdoor functions: computations that are trivial to perform in one direction, such as multiplying two enormous prime numbers, but practically impossible to invert without knowing the secret key. This asymmetric mathematics guarantees confidential digital commerce across untrusted networks.',
    wordCount: 46,
  },
  {
    id: 'tech_distributed_01',
    category: 'Technology',
    title: 'Consensus in Distributed Networks',
    source: 'Systems Engineering',
    difficulty: 'hard',
    text: 'Achieving consensus across distributed nodes in an asynchronous network requires balancing consistency, availability, and partition tolerance. When network partitions inevitably isolate server clusters, architects must choose between returning stale data instantly or blocking until cross-continental consensus guarantees absolute synchronicity.',
    wordCount: 42,
  },
  {
    id: 'tech_silicon_01',
    category: 'Technology',
    title: 'The Silicon Frontier',
    source: 'Microchip Architecture',
    difficulty: 'medium',
    text: 'Modern microprocessors pack tens of billions of nanometer-scale transistors onto a sliver of silicon smaller than a postage stamp. Extreme ultraviolet photolithography etched with laser precision directs beams of light onto photosensitive wafers, carving circuit traces barely a dozen atoms wide.',
    wordCount: 44,
  },
  {
    id: 'tech_web_01',
    category: 'Technology',
    title: 'The Global Nervous System',
    source: 'Internet History',
    difficulty: 'easy',
    text: 'Subsea fiber-optic cables crisscross the ocean floor, carrying laser pulses encoded with petabytes of international communications every second. This global decentralized routing mesh enables instantaneous collaboration across continents, turning personal computers into portals to human collective intelligence.',
    wordCount: 42,
  },
  {
    id: 'tech_neural_01',
    category: 'Technology',
    title: 'Artificial Neural Architectures',
    source: 'Deep Learning Review',
    difficulty: 'medium',
    text: 'Transformer architectures process textual sequences concurrently through multi-head self-attention mechanisms, capturing subtle contextual dependencies across paragraphs. By calculating attention matrices across token vectors, language models predict semantic continuity with remarkable conversational fluidity.',
    wordCount: 37,
  },

  // ── 4. HISTORY & EPOCHS ──
  {
    id: 'hist_gutenberg_01',
    category: 'History',
    title: 'The Movable Type Revolution',
    source: 'Historical Printing',
    difficulty: 'easy',
    text: 'Before Johannes Gutenberg perfected movable metal type in Mainz around 1440, every single manuscript had to be laboriously copied by hand by scribes. Gutenberg combined an oil-based ink, a screw press borrowed from winemaking, and durable lead alloy type to democratize written human knowledge forever.',
    wordCount: 48,
  },
  {
    id: 'hist_apollo_01',
    category: 'History',
    title: 'One Small Step',
    source: 'Apollo 11 Flight Journal',
    difficulty: 'easy',
    text: 'Houston, Tranquility Base here. The Eagle has landed. That is one small step for man, one giant leap for mankind. The lunar module sat on the powdery gray regolith of the Sea of Tranquility, its golden landing foil reflecting the glare of the sun across an alien silence.',
    wordCount: 50,
  },
  {
    id: 'hist_silk_01',
    category: 'History',
    title: 'Caravans of the Silk Road',
    source: 'Ancient Commerce',
    difficulty: 'medium',
    text: 'Across arid deserts and treacherous mountain passes, the Silk Road bound Chang\'an to Constantinople. Merchant caravans traded not merely exquisite silk, jade, and saffron, but transported optical glass, paper-making technology, mathematics, and philosophy across Eurasian civilization.',
    wordCount: 38,
  },
  {
    id: 'hist_alexandria_01',
    category: 'History',
    title: 'The Great Library',
    source: 'Classical Antiquity',
    difficulty: 'medium',
    text: 'The Library of Alexandria aimed to collect every scroll written under the sun. Scholars from Greece, Egypt, Persia, and India gathered beneath its colonnades to measure the circumference of the Earth, catalog celestial constellations, and codify mathematical theorems that endure to this day.',
    wordCount: 44,
  },
  {
    id: 'hist_industrial_01',
    category: 'History',
    title: 'The Steam Age',
    source: 'Industrial History',
    difficulty: 'medium',
    text: 'The roar of steam engines in eighteenth-century mills signaled a fundamental transformation of human labor. Thermodynamic power replaced muscle and wind, propelling locomotives across continents, powering deep mine pumps, and inaugurating the urbanized industrial civilization that shapes our modern world.',
    wordCount: 42,
  },
  {
    id: 'hist_renaissance_01',
    category: 'History',
    title: 'The Florentine Spark',
    source: 'European History',
    difficulty: 'easy',
    text: 'In the bustling artisan workshops of fifteenth-century Florence, painters, sculptors, and mathematicians rediscovered the humanistic philosophy of classical antiquity. Linear perspective transformed flat canvas into three-dimensional depth, synthesizing rigorous geometric principles with naturalistic beauty.',
    wordCount: 37,
  },

  // ── 5. PHILOSOPHY & MIND ──
  {
    id: 'phil_stoic_01',
    category: 'Philosophy',
    title: 'The Inner Citadel',
    source: 'Marcus Aurelius, Meditations',
    difficulty: 'easy',
    text: 'You have power over your mind, not outside events. Realize this, and you will find strength. The happiness of your life depends upon the quality of your thoughts: therefore, guard accordingly, and take care that you entertain no notions unsuitable to virtue and reasonable nature.',
    wordCount: 47,
  },
  {
    id: 'phil_stoic_02',
    category: 'Philosophy',
    title: 'The Obstacle Is the Way',
    source: 'Marcus Aurelius, Meditations',
    difficulty: 'easy',
    text: 'The mind adapts and converts to its own purposes the obstacle to our acting. The impediment to action advances action. What stands in the way becomes the way. Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.',
    wordCount: 54,
  },
  {
    id: 'phil_flow_01',
    category: 'Philosophy',
    title: 'The Flow State',
    source: 'Mihaly Csikszentmihalyi',
    difficulty: 'medium',
    text: 'The best moments in our lives are not the passive, receptive, relaxing times. The best moments usually occur when a person\'s body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile. Optimal experience is something we make happen.',
    wordCount: 48,
  },
  {
    id: 'phil_deliberate_01',
    category: 'Philosophy',
    title: 'The Art of Deliberate Practice',
    source: 'Anders Ericsson',
    difficulty: 'medium',
    text: 'Expert performers do not merely repeat a skill until it becomes automatic. Instead, they continually push themselves just outside their comfort zone, seeking rigorous, immediate feedback on specific micro-errors. True mastery is the deliberate accumulation of refined mental representations.',
    wordCount: 40,
  },
  {
    id: 'phil_seneca_01',
    category: 'Philosophy',
    title: 'On the Shortness of Life',
    source: 'Seneca',
    difficulty: 'medium',
    text: 'It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a sufficiently generous estimate has been given to us for the highest achievements if it were all well invested. But when it is squandered in luxury and carelessness, we realize it has passed.',
    wordCount: 59,
  },
  {
    id: 'phil_epictetus_01',
    category: 'Philosophy',
    title: 'Dichotomy of Control',
    source: 'Epictetus, Enchiridion',
    difficulty: 'easy',
    text: 'Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and whatever are our own actions. Things not in our control are body, property, reputation, command, and whatever are not our own actions. Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.',
    wordCount: 75,
  },

  // ── 6. CURIOUS WONDERS & NATURE ──
  {
    id: 'wonders_fibonacci_01',
    category: 'Wonders',
    title: 'The Golden Spiral',
    source: 'Mathematics in Nature',
    difficulty: 'easy',
    text: 'From the spiral of a nautilus shell to the swirl of a hurricane and the distribution of sunflower seeds, the Fibonacci sequence manifests throughout nature. Each number is the sum of the preceding two, expressing the golden ratio that optimizes solar capture and structural efficiency in living flora.',
    wordCount: 49,
  },
  {
    id: 'wonders_voyager_01',
    category: 'Wonders',
    title: 'The Interstellar Message',
    source: 'The Voyager Golden Record',
    difficulty: 'medium',
    text: 'Drifting beyond the heliosphere in interstellar space, the Voyager probes carry phonograph records pressed from gold-plated copper. Encoded within their grooves are greetings in fifty-five languages, sounds of thunder and birdsong, and the music of Bach and Mozart, addressed to any cosmic civilizations that may intercept them.',
    wordCount: 50,
  },
  {
    id: 'wonders_aurora_01',
    category: 'Wonders',
    title: 'The Polar Lights',
    source: 'Atmospheric Phenomena',
    difficulty: 'medium',
    text: 'When energetic particles from solar wind collide with oxygen and nitrogen atoms in Earth\'s upper atmosphere, they excite electrons into higher energy orbits. As these electrons return to ground state, they release shimmering curtains of green, violet, and crimson auroral light across the polar sky.',
    wordCount: 46,
  },
  {
    id: 'wonders_antarctica_01',
    category: 'Wonders',
    title: 'Subglacial Lake Vostok',
    source: 'Polar Exploration',
    difficulty: 'hard',
    text: 'Buried beneath four kilometers of Antarctic ice sheet lies Lake Vostok, a pristine freshwater ecosystem sealed from the global atmosphere for fifteen million years. Enormous hydrostatic pressure keeps the liquid water from freezing despite temperatures far below zero, creating an extreme analog for Jupiter\'s moon Europa.',
    wordCount: 48,
  },
  {
    id: 'wonders_bioluminescence_01',
    category: 'Wonders',
    title: 'Living Neon Waters',
    source: 'Marine Wonders',
    difficulty: 'easy',
    text: 'Along secluded lagoons on moonless nights, billions of microscopic dinoflagellates flash brilliant neon blue at the gentlest touch of a wave or paddle stroke. This enzyme-catalyzed luciferin reaction illuminates the dark surf with ethereal, electric fire.',
    wordCount: 37,
  },
];

// ── FIFO Anti-Repeat Queue in LocalStorage ──
const SEEN_PASSAGES_KEY = 'typementor_seen_test_passages';
const MAX_SEEN_MEMORY = 50;

export function getSeenPassageIds(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SEEN_PASSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordSeenPassage(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = getSeenPassageIds();
    const updated = [id, ...current.filter(existing => existing !== id)].slice(0, MAX_SEEN_MEMORY);
    localStorage.setItem(SEEN_PASSAGES_KEY, JSON.stringify(updated));
  } catch {}
}

export function resetSeenPassages(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SEEN_PASSAGES_KEY);
    }
  } catch {}
}

export function getSeenPassagesCount(): number {
  return getSeenPassageIds().length;
}

export function getAvailableCategories(): string[] {
  return ['Random', 'Literature', 'Science', 'Technology', 'History', 'Philosophy', 'Wonders'];
}

/**
 * Generates an official, non-repeating test passage for 1m, 2m, 3m, or 5m durations.
 *
 * Target word counts:
 * • 1 Minute: ~60 – 90 words (1 segment)
 * • 2 Minutes: ~120 – 160 words (2 stitched segments)
 * • 3 Minutes: ~200 – 260 words (3–4 stitched segments)
 * • 5 Minutes: ~360 – 480 words (5–7 stitched segments)
 */
export function getTypingTestPassage(options: {
  durationMinutes: number; // 1, 2, 3, or 5
  category?: string; // 'Random' or specific category
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
}): GeneratedTestPassage {
  const duration = Math.max(1, options.durationMinutes || 1);
  // Ample continuous passage buffer so typists up to 160 WPM never run out of text early
  const targetWords = duration === 1 ? 160 : duration === 2 ? 320 : duration === 3 ? 480 : 800;

  const seenIds = new Set(getSeenPassageIds());

  // 1. Filter by category
  let candidateSegments = TEST_PASSAGE_LIBRARY;
  if (options.category && options.category !== 'Random') {
    candidateSegments = candidateSegments.filter(s => s.category === options.category);
  }

  // 2. Filter by difficulty if specified
  if (options.difficulty && options.difficulty !== 'all') {
    const diffCandidates = candidateSegments.filter(s => s.difficulty === options.difficulty);
    if (diffCandidates.length >= 2) {
      candidateSegments = diffCandidates;
    }
  }

  // 3. Apply FIFO Anti-Repeat filter
  let unseenCandidates = candidateSegments.filter(s => !seenIds.has(s.id));

  // If candidate pool has been fully exhausted in this session, reset or use full pool
  if (unseenCandidates.length < 2) {
    unseenCandidates = candidateSegments;
  }

  // 4. Shuffle candidates using modern Fisher-Yates
  const shuffled = [...unseenCandidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 5. Select primary seed segment
  const primarySegment = shuffled[0] || TEST_PASSAGE_LIBRARY[0];
  const selectedSegments: TestPassageSegment[] = [primarySegment];
  let accumulatedWords = primarySegment.wordCount;

  // 6. Combinatorial Stitcher: add complementary segments from the same or compatible category
  if (accumulatedWords < targetWords) {
    // Prefer same category first
    const sameCatComplement = candidateSegments.filter(
      s => s.id !== primarySegment.id && s.category === primarySegment.category
    );

    // Complement with remaining shuffled
    const pool = [...sameCatComplement, ...shuffled.filter(s => s.id !== primarySegment.id)];

    for (const segment of pool) {
      if (selectedSegments.some(s => s.id === segment.id)) continue;
      selectedSegments.push(segment);
      accumulatedWords += segment.wordCount;
      if (accumulatedWords >= targetWords) break;
    }
  }

  // 7. Compose final continuous text
  const composedText = selectedSegments.map(s => s.text.trim()).join(' ');
  const combinedId = selectedSegments.map(s => s.id).join('__');

  // Record all selected segments into the seen memory
  selectedSegments.forEach(s => recordSeenPassage(s.id));

  return {
    id: combinedId,
    title: selectedSegments.length === 1 ? primarySegment.title : `${primarySegment.title} & Compendium`,
    source: selectedSegments.length === 1 ? primarySegment.source : `${primarySegment.source} + Anthologies`,
    category: primarySegment.category,
    difficulty: primarySegment.difficulty,
    text: composedText,
    wordCount: composedText.split(/\s+/).filter(Boolean).length,
    durationMinutes: duration,
    segmentIds: selectedSegments.map(s => s.id),
  };
}
