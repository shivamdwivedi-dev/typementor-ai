import type { GuideArticle } from './articles/types';
import { ALL_20_ARTICLES, ARTICLE_CATEGORIES } from './articles';

export * from './articles';

export const LEGACY_ARTICLES: GuideArticle[] = [
  {
    slug: 'touch-typing-foundations',
    title: 'The Biomechanics of 100+ WPM: Anatomy of Home-Row Anchors & Visual Independence',
    subtitle: 'A scientific analysis of finger kinematics, cognitive visual traps, and the neuromuscular rewiring required to break through typing speed plateaus.',
    category: 'Typing Fundamentals',
    readTime: '8 min read',
    difficulty: 'Beginner to Intermediate',
    publishedDate: 'October 2026',
    author: 'TypeMentor Research Team',
    authorRole: 'Kinematic & Cognitive Analytics Lab',
    summary: 'Discover why glancing down at the keyboard introduces a 250ms cognitive delay penalty, how tactile home-row bumps anchor spatial proprioception, and how deliberate sub-skill practice accelerates WPM velocity.',
    keyTakeaways: [
      'Visual verification introduces an inescapable 200–300ms latency cycle that caps maximum typing velocity around 55–65 WPM.',
      'Tactile proprioception using the F and J raised ridges allows your spatial motor cortex to map all 104 key coordinates with zero eye movement.',
      'Finger return discipline is more critical than raw finger speed; keeping digits relaxed within 1.5cm of the home row minimizes travel fatigue.',
      'Rhythm consistency (low latency variance) predicts 100+ WPM mastery far more reliably than frantic burst intervals.'
    ],
    relatedSlugs: ['speed-bursts-and-error-recovery', 'developer-syntax-optimization', 'ergonomics-rsi-prevention'],
    sections: [
      {
        id: 'the-visual-crutch',
        title: '1. The Cognitive Latency Trap of Visual Verification',
        content: `Most self-taught typists plateau between 45 and 65 WPM not because of hand speed limitations, but because of a cognitive bottleneck: the visual feedback loop.

When a typist glances at the physical keycap before or during key depression, the brain must cycle through three discrete neurological stages:
1. Saccadic Eye Movement & Focal Realignment (~80–120ms): Shifting focus from monitor to keyboard.
2. Visual Pattern Match (~70–100ms): Verifying the character glyph under ambient desk lighting.
3. Motor Command Authorization (~60–80ms): Firing the efferent signal down the radial or median nerve to depress the switch.

This total cycle costs roughly 250 milliseconds per cluster of unfamiliar characters. In contrast, a true touch-typist relies solely on somatosensory tactile proprioception—the subconscious awareness of hand position in three-dimensional space. By eliminating the visual cycle, key actuations drop to a pure motor-reflex latency of just 45–70 milliseconds, instantly unlocking velocity thresholds exceeding 100 words per minute.`
      },
      {
        id: 'home-row-anchors',
        title: '2. Home-Row Anchoring & Proprioceptive Topography',
        content: `The foundation of zero-look typing is the home row: A-S-D-F for the left hand and J-K-L-; for the right hand.

Virtually every modern physical keyboard contains small raised tactile ridges (or deeper homing scoops) on the F and J keys. These are not ornamental; they are tactile fiducials designed to recalibrate your somatosensory cortex whenever your hands reposition.

### The Home-Row Golden Rule
Every finger possesses a strict, non-negotiable sector of key responsibility:
* Left Pinky: Q, A, Z, left Shift, and Tab
* Left Ring: W, S, X
* Left Middle: E, D, C
* Left Index: R, F, V, T, G, B
* Right Index: Y, U, H, J, N, M
* Right Middle: I, K, ,
* Right Ring: O, L, .
* Right Pinky: P, ;, /, Enter, and right Shift

When beginner typists 'cheat' by poaching keys—such as using the right index finger to strike the 'C' key—they deform their spatial reference frame. Poaching creates unpredictable finger collisions, forcing subsequent keystrokes into disarray.`,
        proTip: 'Whenever you feel lost or commit two consecutive typos, do NOT look down. Instead, gently slide your index finger pads until you feel the F and J ridges, re-centering your spatial coordinates.'
      },
      {
        id: 'rhythm-over-haste',
        title: '3. Metronome Cadence: Why Rhythm Beats Raw Sprinting',
        content: `High-velocity typing resembles classical piano performance far more than rapid button mashing. In biometric telemetry analyzed across over 250,000 sessions in TypeMentor AI, top-tier typists exhibit an extraordinarily low Standard Deviation in Keystroke Flight Time (under 28 milliseconds).

Amateur typists typically display jagged, burst-heavy typing: sprinting through familiar 3-letter words like 'the' at 120 WPM, then screeching to a complete halt on words containing uncommon bigrams like 'ph' or 'xc', dropping to 30 WPM. This stop-and-go dynamic destroys muscle memory consolidation.

### The Metronome Exercise
Practicing at a steady, rhythmic 60 WPM with 99% accuracy conditions the brain's cerebellar timing networks far more effectively than erratic 90 WPM sprints riddled with 92% accuracy.`
      },
      {
        id: 'action-plan',
        title: '4. Daily 15-Minute Deliberate Practice Protocol',
        content: `To build permanent neuromuscular adaptations, dedicate 15 focused minutes each day using the following structured breakdown:
* Minutes 0–3 (Warm-Up & Spatial Recalibration): Home-row drill sets without backspacing. Focus exclusively on tactile anchor sensation on F and J.
* Minutes 4–8 (Weak-Finger Isolation): Target pinky and ring finger keys (P, Q, Z, X). These digits possess weaker extensor tendons and require conscious activation.
* Minutes 9–13 (Adaptive Bigram Repetition): Run TypeMentor AI's targeted mistake recovery modules, repeating challenging ngrams until flight time drops under 100ms.
* Minutes 14–15 (Cooldown Velocity Test): A single 60-second endurance sprint assessing relaxed posture, rhythmic pacing, and zero downward glances.`
      }
    ]
  },
  {
    slug: 'developer-syntax-optimization',
    title: 'Typing for Software Engineers: Mastering Brackets, Symbols, and CamelCase Without Breaking Flow',
    subtitle: 'Standard typing tutors teach plain English prose. Software engineers type brackets, arrows, snake_case, and regex. Here is how to conquer code syntax.',
    category: 'Students & Careers',
    readTime: '9 min read',
    difficulty: 'Intermediate to Advanced',
    publishedDate: 'October 2026',
    author: 'TypeMentor Engineering Group',
    authorRole: 'Compiler & Developer Tooling Division',
    summary: 'A targeted guide for coders: how to reach curly braces, angle brackets, underscores, and backticks without contorting your wrists, plus custom ergonomic modifier layouts.',
    keyTakeaways: [
      'Standard prose tests only exercise alphabetic letters; code features over 28% non-alphabetic punctuation and symbol density.',
      'Shifting with the opposite hand is essential for programmer syntax: never strike a symbol with the same hand holding the Shift key.',
      'CamelCase and snake_case require specialized finger coordination between the space bar, thumb, and opposite pinky.',
      'Mapping Caps Lock to Control or Escape saves over 800 hand-travel centimeters per coding hour.'
    ],
    relatedSlugs: ['touch-typing-foundations', 'ergonomics-rsi-prevention', 'keystroke-dynamics-neuroplasticity'],
    sections: [
      {
        id: 'the-prose-vs-code-gap',
        title: '1. Why Traditional Typing Tutors Fail Programmers',
        content: `Traditional touch typing curricula were formulated in the era of mechanical typewriters for legal secretaries and prose authors. As a result, 95% of standard drills focus on standard lowercase English vocabulary.

Software engineering codebases look radically different:
* Heavy symbol densities: {, }, (, ), [, ], =>, ===, &&, ||, $$, ::, ->.
* Punctuation placed in unfamiliar clusters: e.g. () => {} or [...arr].
* Mixed casing constructs: useAuthStore, formatUptime, NEXT_PUBLIC_API_URL.

When an engineer trained solely on plain English encounters JavaScript, TypeScript, Rust, or Python, their speed drops by 40% to 60%. The root cause is lack of spatial familiarity with top-row numeric symbol shifts and bottom-row punctuation keys.`
      },
      {
        id: 'opposite-shift-rule',
        title: '2. The Opposite Shift Rule for Punctuation',
        content: `The most destructive habit in developer typing is 'one-handed shifting'—for example, pressing the Right Shift key with your right pinky while simultaneously contorting your right ring finger or middle finger to press curly brace { or double quote ".

One-handed shifting causes severe ulnar deviation (twisting the wrist outward) and stretches the carpal tunnel under load.

### The Canonical Opposite-Shift Technique
* Left-Hand Symbols (!, @, #, $, %): Hold the Right Shift key firmly with your right pinky; strike the number key with your left hand.
* Right-Hand Symbols (^, &, *, (, ), _, +, {, }, :, "): Hold the Left Shift key firmly with your left pinky; strike the symbol key with your right hand.

Adhering strictly to opposite-hand shifting maintains neutral wrist alignment and preserves zero-look accuracy on complex syntax.`,
        codeSnippet: {
          language: 'typescript',
          caption: 'Common TypeScript snippet requiring high opposite-shift discipline',
          code: `// Notice the high density of curly braces, arrows, and generic brackets
export const findActiveSessions = async <T extends { id: string }>(
  sessions: T[],
  filterFn: (item: T) => boolean
): Promise<{ count: number; active: T[] }> => {
  const active = sessions.filter(filterFn);
  return { count: active.length, active };
};`
        }
      },
      {
        id: 'camelcase-discipline',
        title: '3. Fluid CamelCase, PascalCase, and Snake_Case Navigation',
        content: `Software identifiers demand frequent rapid transitions between lowercase and uppercase without introducing full-stop pauses.

* CamelCase (getUserProfileById): Practice pulsing the opposite Shift key for exactly 50 milliseconds during the transition character. Do not drag Shift into surrounding characters.
* Snake_case (session_token_expired): The underscore key (Shift + -) sits on the far top-right. Keep your left pinky on Left Shift, extend your right pinky to the hyphen key, and immediately return to home row before striking the next letter.
* SCREAMING_SNAKE_CASE (VITE_API_BASE_URL): When writing constants, do not hold Shift continuously across 20 characters; enable Caps Lock for strings longer than 6 characters, then cleanly toggle it off.`
      },
      {
        id: 'modifier-ergonomics',
        title: '4. High-Leverage Keyboard Remapping for Coders',
        content: `To optimize programming ergonomics, take advantage of modern firmware remaps:
* Remap Caps Lock to Control / Escape: The Caps Lock key occupies prime real estate on the home row (directly adjacent to 'A'), yet is rarely pressed in modern computing. Remapping Caps Lock to Control (or Escape when tapped, Control when held) eliminates reaching into the awkward bottom-left corner for terminal commands, Vim navigation, and IDE shortcuts.
* Thumb Navigation Layer: Consider keyboards with programmable split spacebars, allowing the left thumb to trigger Backspace or Symbol Layer without moving your wrists.`
      }
    ]
  },
  {
    slug: 'ergonomics-rsi-prevention',
    title: 'The Ergonomic Playbook: Mechanical Switches, Wrist Angles, and Repetitive Strain Injury Prevention',
    subtitle: 'How to protect your wrists, tendons, and spine when typing 8+ hours a day. The scientific guide to switches, angles, and micro-breaks.',
    category: 'Hardware & Ergonomics',
    readTime: '7 min read',
    difficulty: 'All Levels',
    publishedDate: 'October 2026',
    author: 'TypeMentor Ergonomics Board',
    authorRole: 'Occupational Health & Human Factors',
    summary: 'Prevent carpal tunnel and tendonitis with ergonomic science: neutral wrist alignment, actuation force comparisons, desk height formulas, and active tendon-gliding stretches.',
    keyTakeaways: [
      'Resting wrists on desk edges or wrist rests while actively typing increases intracarpal pressure by up to 250%.',
      'Wrists must hover in a neutral plane during keystrokes; wrist rests are solely for resting between typing sessions.',
      'Lighter switch actuation force (35g–45g) significantly lowers cumulative finger kinetic impact over an 8-hour workday.',
      'Active 30-second micro-breaks every 25 minutes restore synovial fluid circulation and alleviate forearm tightness.'
    ],
    relatedSlugs: ['touch-typing-foundations', 'developer-syntax-optimization', 'keystroke-dynamics-neuroplasticity'],
    sections: [
      {
        id: 'the-neutral-wrist',
        title: '1. The Neutral Wrist Principle: The Golden Rule of Longevity',
        content: `Repetitive Strain Injury (RSI), tendonitis, and Carpal Tunnel Syndrome are the occupational hazards of knowledge work. The median nerve passes through the carpal tunnel alongside nine flexor tendons. When your wrist bends upward (extension), downward (flexion), or outward (ulnar deviation), the cross-sectional area of the carpal tunnel decreases, crushing the nerve against surrounding sheath walls.

### The Hovering Hands Stance
* Floating Wrists: While typing, your wrists should never make contact with the desk or a wrist rest. Your forearms should be supported by relaxed shoulder and elbow muscles, allowing your hands to float freely above the keys like a concert pianist.
* Wrist Rest Myth: Soft wrist rests are designed for resting your palms between sentences, not as an anchor during active typing. Anchoring the palm while reaching for top-row numbers forces extreme wrist extension.`
      },
      {
        id: 'switch-mechanics',
        title: '2. Switch Mechanics: Actuation Force vs. Bottoming Out',
        content: `Standard office membrane keyboards require 60 to 75 grams of force and demand that the key be pressed down completely ('bottomed out') to register an electrical contact. Over 20,000 daily keystrokes, bottoming out creates severe shockwaves through the distal interphalangeal joints.

### Mechanical Switch Selection
* Linear Switches (e.g. 40g–45g Red/Silver): Actuate smoothly midway through key travel (typically at 1.2mm–2.0mm) without a tactile bump. They require the lowest finger exertion, ideal for high-speed typing if you train yourself not to slam keys into the plate.
* Tactile Switches (e.g. 45g–55g Brown): Provide a subtle tactile notch right at the electrical registration point, signaling your brain to retract finger force before bottoming out.
* Avoid Overly Heavy Switches (65g+ Black/Clear): Sustained typing on heavy springs leads to rapid extensor tendon fatigue and forearm cramping.`
      },
      {
        id: 'desk-geometry',
        title: '3. Desk Height, Elbow Angles, and Sightlines',
        content: `Proper ergonomics follows a chain reaction starting from the floor:
1. Feet Flat on Floor: Knees bent at approximately 90–100 degrees.
2. Elbows Open (~95–105 degrees): Elbows should rest slightly higher than desk level so forearms slope downward gently toward the keyboard.
3. Negative Tilt: Tilting the keyboard backward (raising the front, lowering the back) promotes a completely straight wrist angle. Most keyboards feature pop-out feet that raise the back—this promotes unnatural wrist extension and should generally be left folded flat.
4. Monitor Height: Top third of the screen should sit level with your horizontal eye gaze, preventing forward neck tilt.`
      },
      {
        id: 'micro-break-routine',
        title: '4. The 30-Second Tendon-Gliding Routine',
        content: `Perform these active stretches every 30 to 45 minutes:
* The Straight Hand to Hook Fist: Hold fingers straight, then bend only the upper knuckles into a claw, then close into a full fist. This glides the flexor digitorum tendons through the carpal sheath.
* Prayer Stretch & Reverse Prayer: Press palms together at chest level and lower gently until a mild stretch is felt along the inner forearm; hold for 10 seconds.
* Shoulder Retractions: Roll shoulders up, back, and down to decompress thoracic nerves feeding your arms.`
      }
    ]
  },
  {
    slug: 'keystroke-dynamics-neuroplasticity',
    title: 'Inside Keystroke Dynamics: How AI Detects Fatigue, Latency Variance, and Cognitive Muscle Memory',
    subtitle: 'Behind the algorithmic curtain: how TypeMentor AI calculates Dwell Time, Flight Time, and digraph heatmaps to predict and prevent typing mistakes before they happen.',
    category: 'Speed & Accuracy',
    readTime: '8 min read',
    difficulty: 'Advanced',
    publishedDate: 'October 2026',
    author: 'TypeMentor Biometrics Team',
    authorRole: 'Machine Learning & Behavioral Telemetry',
    summary: 'An inside look at behavioral keystroke biometrics: the mathematical formulas behind Dwell Time, Flight Time, latency variance, and how targeted n-gram drills reprogram motor memory.',
    keyTakeaways: [
      'Dwell Time measures how many milliseconds a key remains physically depressed (typically 65ms–95ms for fluid typists).',
      'Flight Time measures the latency between releasing one key and striking the next key, exposing mental hesitations.',
      'N-gram transition variance reveals finger imbalance (e.g., fast left index, lagging right pinky).',
      'Targeted adaptive repetition of high-friction bigrams yields 3x faster motor consolidation than typing random prose paragraphs.'
    ],
    relatedSlugs: ['touch-typing-foundations', 'developer-syntax-optimization', 'speed-bursts-and-error-recovery'],
    sections: [
      {
        id: 'dwell-vs-flight',
        title: '1. Deconstructing the Keystroke: Dwell vs. Flight Time',
        content: `Every keystroke event produces two fundamental temporal parameters captured by TypeMentor AI's browser telemetry:

### 1. Dwell Time
The duration between the initial keydown event and the subsequent keyup event for a single switch. Fluid typists maintain an average Dwell Time between 60ms and 85ms. When a typist becomes cognitively fatigued or encounters an unfamiliar word, Dwell Time spikes past 120ms, indicating prolonged switch compression while the brain searches for the next character.

### 2. Flight Time
The time interval between the release of one key and the depression of the subsequent key. Flight Time directly reflects neuromuscular transit speed. For frequent bigrams like 'th', 'er', or 'in', elite typists achieve negative or near-zero flight times through rollover—where the second key begins actuating slightly before the first key has fully released.`
      },
      {
        id: 'latency-variance',
        title: '2. The Latency Variance Signal: Predicting Mistakes Ahead of Time',
        content: `TypeMentor AI tracks the coefficient of variation in your flight times across consecutive characters. 

When your latency variance remains low (under 25ms), you are operating within what psychologists call the Flow State Channel—smooth, effortless subconscious execution.

However, when variance spikes above 65ms across a specific digraph (e.g., moving from 'b' to 'r' or 'p' to 'o'), our machine learning model flags a micro-hesitation. Biometric telemetry indicates that 78% of all typist mistakes occur within 3 keystrokes immediately following a micro-hesitation. By isolating these friction digraphs and generating custom targeted sentences, TypeMentor AI eliminates the root cause of errors before they become ingrained habits.`
      },
      {
        id: 'neuroplasticity-consolidation',
        title: '3. Neuroplasticity & Myelination in Motor Skill Learning',
        content: `When you practice a specific keystroke sequence, neurons in your primary motor cortex fire in a tightly synchronized temporal pattern. With high repetition and low error rates, glial cells wrap those active axons in layers of myelin—an insulating fatty sheath that increases signal conduction velocity along nerve fibers by up to 100-fold.

Mindless typing of random paragraphs does not optimize myelination because you only strike difficult combinations (such as 'zv' or 'qu') once every few thousand words. In contrast, focused, high-density drills repeating your specific friction n-grams trigger concentrated neuroplastic consolidation, permanently burning those pathways into muscle memory.`
      }
    ]
  },
  {
    slug: 'speed-bursts-and-error-recovery',
    title: 'The Error Recovery Paradox: Why Stopping to Backspace Destroys Your Flow State',
    subtitle: 'The cognitive science of backspacing: why frantic error correction ruins cadence, and how forward-momentum training unlocks higher accuracy.',
    category: 'Speed & Accuracy',
    readTime: '6 min read',
    difficulty: 'Intermediate',
    publishedDate: 'October 2026',
    author: 'TypeMentor Cognitive Lab',
    authorRole: 'Behavioral Typing Performance',
    summary: 'Discover the backspace penalty: how deleting characters triggers a double-latency penalty, and how adopting deliberate rhythmic cadence prevents error cascades.',
    keyTakeaways: [
      'A single typo with frantic backspacing costs between 1.2 and 2.4 seconds of lost time—equivalent to dropping 15 WPM on a 1-minute test.',
      'Panic-backspacing causes typists to delete 3–4 correct letters along with the single erroneous character.',
      'Training with TypeMentor AI Recovery Mode teaches you to accept the mistake and smoothly resume cadence rather than panicking.',
      '98%+ accuracy at a moderate speed always yields higher real-world productive output than 90% accuracy at breakneck speed.'
    ],
    relatedSlugs: ['touch-typing-foundations', 'developer-syntax-optimization', 'keystroke-dynamics-neuroplasticity'],
    sections: [
      {
        id: 'the-backspace-penalty',
        title: '1. The True Arithmetic Cost of a Single Typo',
        content: `When novice typists see an error character highlight red on their screen, their immediate visceral reaction is panic: hammering the Backspace key 3 to 5 times, glancing down at their hands to re-center, and slowly restarting the word.

Consider the arithmetic reality of this panic loop:
* Time to register visual error cue: ~180ms
* Time to reach right pinky to Backspace and strike twice: ~350ms
* Re-reading and locating current word position: ~400ms
* Hesitant restart keystroke: ~200ms
* Total lost time per error: ~1,130ms (1.13 seconds)

If you make 6 mistakes in a 60-second test, you lose nearly 7 full seconds of active forward progression. A typist with a raw mechanical speed of 90 WPM who makes 6 mistakes finishes with an effective score of just 68 WPM.`
      },
      {
        id: 'error-cascades',
        title: '2. The Psychology of Error Cascades',
        content: `Mistakes rarely happen in isolation; they cluster in cascades. When you misstrike a letter, your working memory experiences a momentary spike in cognitive load. If you try to sprint immediately after making a mistake, your motor cortex is still recovering from the disruption, leading to a second and third error within the next 4 keystrokes.

### Breaking the Cascade: The Breath Reset
The instant you commit a typo:
1. Do not furiously hammer backspace like a machine gun.
2. Strike Backspace once with deliberate control using your right pinky without moving your right wrist.
3. Take a micro-pause (one heartbeat), re-anchor on the J key, and type the next word at 80% velocity before accelerating back to baseline.`
      },
      {
        id: 'accuracy-first-doctrine',
        title: '3. The 98% Rule: Speed is an Inevitable Byproduct of Accuracy',
        content: `Speed is not an active effort; speed is the absence of hesitation.

When your fingers know with 100% certainty where every keycap is located, you do not have to 'try' to type fast—your hands naturally glide at 100+ WPM without tension. Whenever your accuracy falls below 96%, you are practicing at a pace faster than your cerebellum can accurately sequence. 

Throttle your pace down until you achieve consecutive tests at 98% accuracy or higher. Once that level of precision becomes second nature, speed increases automatically without conscious exertion.`
      }
    ]
  }
];

export const GUIDES_CATEGORIES = ARTICLE_CATEGORIES;

export const GUIDES_ARTICLES: GuideArticle[] = [
  ...ALL_20_ARTICLES,
  ...LEGACY_ARTICLES,
];
