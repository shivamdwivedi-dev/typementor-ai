export interface AcademyLesson {
  id: number;
  title: string;
  goal: string;
  keys: string[];
  placement: string;
  text: string;
  minWpm: number;
  minAccuracy: number;
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 1,
    title: 'Keyboard Posture and Home Row',
    goal: 'Learn proper keyboard posture and locate the home row keys.',
    keys: ['F', 'J'],
    placement: 'Place your left index finger on F (feel the bump) and right index finger on J (feel the bump). Other fingers rest on the adjacent keys.',
    text: 'f j f j ff jj f f j j fj jf ffjj jjff f j',
    minWpm: 10,
    minAccuracy: 80
  },
  {
    id: 2,
    title: 'F and J Anchor Keys',
    goal: 'Solidify your coordination on the F and J bumps without looking.',
    keys: ['F', 'J', ' '],
    placement: 'Left index on F, right index on J. Use either thumb for the spacebar.',
    text: 'fff jjj ff jj f j f j ff jj f j fj jf',
    minWpm: 12,
    minAccuracy: 85
  },
  {
    id: 3,
    title: 'A S D F Left Hand',
    goal: 'Introduce the rest of the left hand home row keys: A, S, and D.',
    keys: ['A', 'S', 'D', 'F'],
    placement: 'Left pinky on A, left ring on S, left middle on D, left index on F.',
    text: 'asdf fdsa asdf fdsa as as sd sd df df a s d f',
    minWpm: 15,
    minAccuracy: 85
  },
  {
    id: 4,
    title: 'J K L ; Right Hand',
    goal: 'Introduce the rest of the right hand home row keys: K, L, and semicolon.',
    keys: ['J', 'K', 'L', ';'],
    placement: 'Right index on J, right middle on K, right ring on L, right pinky on ;.',
    text: 'jkl; ;lkj jkl; ;lkj jk kl l; jk kl l; j k l ;',
    minWpm: 15,
    minAccuracy: 85
  },
  {
    id: 5,
    title: 'Home Row Full Practice',
    goal: 'Combine left and right hand home row keys in fluid sequences.',
    keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'],
    placement: 'Rest all eight fingers on their home row keys.',
    text: 'asdf jkl; a; s l d k f j asdfjkl; a s d f j k l ;',
    minWpm: 18,
    minAccuracy: 90
  },
  {
    id: 6,
    title: 'G and H Central Keys',
    goal: 'Stretch index fingers to reach G (left) and H (right).',
    keys: ['G', 'H'],
    placement: 'Stretch left index to G, right index to H. Return to F and J after typing.',
    text: 'fgf jhj fgf jhj f g f j h j fgjh gh fg fg gh jh hj',
    minWpm: 18,
    minAccuracy: 90
  },
  {
    id: 7,
    title: 'E and I Top Row',
    goal: 'Reach top row vowels: E (left middle) and I (right middle).',
    keys: ['E', 'I'],
    placement: 'Reach left middle finger up to E. Reach right middle finger up to I.',
    text: 'ded kik ded kik de ki ed ik de ed ki ik deki e i',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 8,
    title: 'R and U Top Row',
    goal: 'Reach top row keys: R (left index) and U (right index).',
    keys: ['R', 'U'],
    placement: 'Reach left index up to R. Reach right index up to U.',
    text: 'frf juj frf juj fr ju rf uj ru ur fr ju ru ur r u',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 9,
    title: 'T and Y Top Row',
    goal: 'Reach central top row keys: T (left index) and Y (right index).',
    keys: ['T', 'Y'],
    placement: 'Reach left index up-right to T. Reach right index up-left to Y.',
    text: 'ftf jyj ftf jyj ft jy tf yj ty yt ft jy ty yt t y',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 10,
    title: 'Q and P Outer Reaches',
    goal: 'Reach outer top row keys: Q (left pinky) and P (right pinky).',
    keys: ['Q', 'P'],
    placement: 'Reach left pinky up to Q. Reach right pinky up to P.',
    text: 'aqaf ;p; aqaf ;p; aq ;p qa p; qp pq aq ;p q p',
    minWpm: 18,
    minAccuracy: 85
  },
  {
    id: 11,
    title: 'W and O Ring Fingers',
    goal: 'Reach top row keys: W (left ring) and O (right ring).',
    keys: ['W', 'O'],
    placement: 'Reach left ring finger up to W. Reach right ring finger up to O.',
    text: 'sws lol sws lol sw lo ws ol wo ow sw lo wo ow w o',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 12,
    title: 'Top Row Full Practice',
    goal: 'Synthesize all top row keys introduced so far.',
    keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    placement: 'Coordinate top row reaches from home row bases.',
    text: 'qwert yuiop qw er ty ui op qert yuio qp wo ei ru ty',
    minWpm: 22,
    minAccuracy: 90
  },
  {
    id: 13,
    title: 'V and M Bottom Row',
    goal: 'Reach bottom row keys: V (left index) and M (right index).',
    keys: ['V', 'M'],
    placement: 'Reach left index finger down-right to V. Reach right index down-left to M.',
    text: 'fvf jmj fvf jmj fv jm vf mj vm mv fv jm vm mv v m',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 14,
    title: 'C and Comma',
    goal: 'Reach bottom row keys: C (left middle) and comma (right middle).',
    keys: ['C', ','],
    placement: 'Reach left middle finger down to C. Reach right middle finger down to comma.',
    text: 'dcd k,k dcd k,k dc k, cd ,k c, ,c dc k, c, ,c c ,',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 15,
    title: 'X and Period',
    goal: 'Reach bottom row keys: X (left ring) and period (right ring).',
    keys: ['X', '.'],
    placement: 'Reach left ring finger down to X. Reach right ring finger down to period.',
    text: 'sxs l.l sxs l.l sx l. xs .l x. .x sx l. x. .x x .',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 16,
    title: 'Z and Slash',
    goal: 'Reach outer bottom row keys: Z (left pinky) and slash (right pinky).',
    keys: ['Z', '/'],
    placement: 'Reach left pinky finger down to Z. Reach right pinky finger down to slash.',
    text: 'aza ;/; aza ;/; az ;/ za /; z/ /z az ;/ z/ /z z /',
    minWpm: 18,
    minAccuracy: 85
  },
  {
    id: 17,
    title: 'B and N Bottom Row',
    goal: 'Reach central bottom row keys: B (left index) and N (right index).',
    keys: ['B', 'N'],
    placement: 'Reach left index down-right to B. Reach right index down-left to N.',
    text: 'fbf jnj fbf jnj fb jn bf nb bn nb fb jn bn nb b n',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 18,
    title: 'Bottom Row Full Practice',
    goal: 'Practice all bottom row characters together.',
    keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
    placement: 'Reach bottom row keys smoothly and return to home row.',
    text: 'zxcvb nm,./ zx cv bn m, ./ zc vm b, n. z/ x, c. vb',
    minWpm: 20,
    minAccuracy: 90
  },
  {
    id: 19,
    title: 'Spacebar Control',
    goal: 'Establish steady rhythm utilizing the spacebar with your thumbs.',
    keys: [' '],
    placement: 'Keep thumbs hovering lightly over the spacebar.',
    text: 'the red dog ran the fat cat sat the wet hen flew the cup',
    minWpm: 25,
    minAccuracy: 90
  },
  {
    id: 20,
    title: 'Shift Key Basics',
    goal: 'Learn to use left and right Shift keys for capitalization.',
    keys: ['Shift'],
    placement: 'Use opposite hand Shift: right Shift for left hand keys, left Shift for right hand keys.',
    text: 'F J A S D K L G H R E I T Y Q P W O V M C X Z B N',
    minWpm: 22,
    minAccuracy: 90
  },
  {
    id: 21,
    title: 'Capital Letters',
    goal: 'Combine character keys with Shift keys to type capitalized words.',
    keys: ['Shift'],
    placement: 'Use your pinky fingers on Shift while the opposite hand types the letter.',
    text: 'The Red Dog Ran Fast Jkl; Java Python Swift Go Rust Web',
    minWpm: 25,
    minAccuracy: 92
  },
  {
    id: 22,
    title: 'Numbers Row',
    goal: 'Reach up from home row to type numbers: 1 to 0.',
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    placement: 'Reach fingers up past the top row to reach their corresponding number key.',
    text: '12345 67890 1 2 3 4 5 6 7 8 9 0 10 20 30 40 50 60 70 80 90',
    minWpm: 20,
    minAccuracy: 85
  },
  {
    id: 23,
    title: 'Common Symbols',
    goal: 'Type common symbols using Shift on the numbers row.',
    keys: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    placement: 'Hold Shift while reaching for the numbers row.',
    text: 'hello! email@domain #code $100 50% up^and *star (parent)',
    minWpm: 20,
    minAccuracy: 85
  },
  {
    id: 24,
    title: 'Punctuation Practice',
    goal: 'Type standard symbols like question mark, exclamation, quotes, and brackets.',
    keys: ['?', '!', '"', "'", '(', ')'],
    placement: 'Maintain home row anchor while tapping punctuation keys.',
    text: 'is it cold? "yes, it is!" she said, (very loudly).',
    minWpm: 25,
    minAccuracy: 90
  },
  {
    id: 25,
    title: 'Common English Words',
    goal: 'Build muscle memory for high-frequency words.',
    keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'E', 'T', 'O', 'I', 'N', 'W'],
    placement: 'Type fluidly, focusing on smooth word flows.',
    text: 'the and of to in is you that it he was for on are as with',
    minWpm: 30,
    minAccuracy: 92
  },
  {
    id: 26,
    title: 'Speed Control',
    goal: 'Maintain consistent pace to build typing speed.',
    keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'],
    placement: 'Keep hands relaxed and maintain standard anchor positions.',
    text: 'quick brown fox jumps over the lazy dog repeatedly',
    minWpm: 35,
    minAccuracy: 90
  },
  {
    id: 27,
    title: 'Accuracy Challenge',
    goal: 'Focus entirely on precision. No mistakes allowed!',
    keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';', 'E', 'I', 'R', 'U'],
    placement: 'Type slowly to achieve maximum accuracy.',
    text: 'accuracy is much more important than sheer speed',
    minWpm: 25,
    minAccuracy: 98
  },
  {
    id: 28,
    title: 'Mixed Paragraph Practice',
    goal: 'Type paragraphs mixing capital letters, lowercase, and punctuation.',
    keys: ['Shift', 'Punctuation'],
    placement: 'Transition smoothly between rows and case changes.',
    text: 'Touch typing is a valuable skill for coders, writers, and students.',
    minWpm: 30,
    minAccuracy: 92
  },
  {
    id: 29,
    title: 'Beginner Endurance Practice',
    goal: 'Maintain typing stamina over longer sentences.',
    keys: ['All'],
    placement: 'Rest your wrists and stay loose.',
    text: 'Practice makes perfect. Typing every day trains muscle memory for speed.',
    minWpm: 30,
    minAccuracy: 92
  },
  {
    id: 30,
    title: 'Final Beginner Test',
    goal: 'Pass the beginner certification test with balanced speed and accuracy.',
    keys: ['All'],
    placement: 'Combine all mechanics learned across the Typing Academy.',
    text: 'You have completed the beginner typing course! Great job.',
    minWpm: 35,
    minAccuracy: 95
  },
  {
    id: 31,
    title: 'Intermediate Capitalization & Flow',
    goal: 'Introduce capitalization with longer, professional words.',
    keys: ['Shift', 'Caps'],
    placement: 'Use opposite hand Shift keys for uppercase letters.',
    text: 'The quick brown fox jumps over the lazy dog.',
    minWpm: 38,
    minAccuracy: 93
  },
  {
    id: 32,
    title: 'Long English Words Drill',
    goal: 'Type longer words with alternating hand patterns.',
    keys: ['All'],
    placement: 'Keep a steady pacing. Do not rush over syllables.',
    text: 'understanding developer standard professional sequence database analytics developer',
    minWpm: 40,
    minAccuracy: 93
  },
  {
    id: 33,
    title: 'Mixed Punctuation Introduction',
    goal: 'Type sentences incorporating commas, questions, and exclamation points.',
    keys: [',', '?', '!'],
    placement: 'Reach for punctuation with your right pinky and middle fingers.',
    text: 'Wait, is this real? Yes, it is! Awesome.',
    minWpm: 35,
    minAccuracy: 93
  },
  {
    id: 34,
    title: 'Top Row and Number Integration',
    goal: 'Integrate the numbers row with standard top row keys.',
    keys: ['1', '0', ';'],
    placement: 'Reach up from home row home bases to numerical keys.',
    text: 'The code is 1024; please verify it now.',
    minWpm: 35,
    minAccuracy: 92
  },
  {
    id: 35,
    title: 'Home Row with Complex Shifts',
    goal: 'Practice Shift coordination on capital home row keys.',
    keys: ['Shift'],
    placement: 'Hold Shift with opposite pinky and hit the character key.',
    text: 'Kelsey and David sat beside the lake in July.',
    minWpm: 38,
    minAccuracy: 93
  },
  {
    id: 36,
    title: 'Professional Sentence Pacing',
    goal: 'Type professional business sentences with smooth transitions.',
    keys: ['All'],
    placement: 'Maintain consistent speed across word boundaries.',
    text: 'Please send the corrected document before tomorrow morning.',
    minWpm: 40,
    minAccuracy: 94
  },
  {
    id: 37,
    title: 'Mixed Case and Numbers',
    goal: 'Practice shifts and numbers in database style data entries.',
    keys: ['Shift', 'Numbers'],
    placement: 'Look at the screen, not the keys.',
    text: 'We received 45 files from the QA team on Tuesday.',
    minWpm: 38,
    minAccuracy: 92
  },
  {
    id: 38,
    title: 'Keyboard Rhythm and Double Letters',
    goal: 'Improve finger transitions on double characters.',
    keys: ['All'],
    placement: 'Relax your fingers for quick double taps.',
    text: 'The balloon floated high above the green valley.',
    minWpm: 40,
    minAccuracy: 94
  },
  {
    id: 39,
    title: 'Intermediate Paragraph Drill',
    goal: 'Type longer paragraphs with mixed punctuation.',
    keys: ['Punctuation'],
    placement: 'Ensure clean keystrokes and focus on rhythmic speed.',
    text: 'Regular typing practice builds strong motor control. Keep your wrists level.',
    minWpm: 42,
    minAccuracy: 94
  },
  {
    id: 40,
    title: 'Number and Symbol Combination',
    goal: 'Coordinate symbols and numbers using Shift.',
    keys: ['$', '%', '(', ')'],
    placement: 'Pinky holds Shift, ring and index fingers reach numbers row.',
    text: 'Cost: $15.50 each (with 20% discount applied).',
    minWpm: 35,
    minAccuracy: 90
  },
  {
    id: 41,
    title: 'Common Coding Keywords Flow',
    goal: 'Practice common programming syntax structures.',
    keys: ['/', "'", ';'],
    placement: 'Prepare fingers for code brackets and punctuation reaches.',
    text: "const results = await fetch('/api/coach/lesson');",
    minWpm: 38,
    minAccuracy: 92
  },
  {
    id: 42,
    title: 'Punctuation and Quotes',
    goal: 'Type double quotes and question marks in dialogue flow.',
    keys: ['"', '?'],
    placement: 'Type quotes by holding Shift and tapping the quote key.',
    text: '"What is your typing speed?" she asked the student.',
    minWpm: 40,
    minAccuracy: 93
  },
  {
    id: 43,
    title: 'Double Shifts & Symbol Placement',
    goal: 'Coordinate multiple uppercase shifts with punctuation.',
    keys: ['Shift', '!'],
    placement: 'Alternate shift hands cleanly.',
    text: 'TypeMentor AI helps you achieve Elite rating!',
    minWpm: 42,
    minAccuracy: 94
  },
  {
    id: 44,
    title: 'Intermediate Speed Drill',
    goal: 'Focus purely on speed with longer, fluent sentences.',
    keys: ['All'],
    placement: 'Maintain loose posture and push your pacing.',
    text: 'maximize typing efficiency by maintaining steady pacing',
    minWpm: 48,
    minAccuracy: 92
  },
  {
    id: 45,
    title: 'Intermediate Accuracy Drill',
    goal: 'Focus entirely on precision. High accuracy target.',
    keys: ['All'],
    placement: 'Slow down slightly to ensure zero mistakes.',
    text: 'Precise keystrokes prevent frustrating mistakes and build speed.',
    minWpm: 35,
    minAccuracy: 97
  },
  {
    id: 46,
    title: 'Professional Correspondence Flow',
    goal: 'Type professional business sentences with clean punctuation.',
    keys: ['All'],
    placement: 'Focus on fluid hand movements across the keys.',
    text: 'Let me know if you can attend the design review meeting.',
    minWpm: 42,
    minAccuracy: 94
  },
  {
    id: 47,
    title: 'Numeric Data Flow',
    goal: 'Type numbers, dashes, and periods efficiently.',
    keys: ['-', 'Numbers'],
    placement: 'Keep home row anchor with left hand while right hand reaches numbers.',
    text: 'Phone: 800-555-0199. Extension: 4022.',
    minWpm: 38,
    minAccuracy: 92
  },
  {
    id: 48,
    title: 'Stamina Mini Drill',
    goal: 'Train muscle endurance with a longer single sentence run.',
    keys: ['All'],
    placement: 'Keep a steady rhythm and stay relaxed.',
    text: 'Consistency is more important than sheer speed when learning touch typing skills.',
    minWpm: 44,
    minAccuracy: 94
  },
  {
    id: 49,
    title: 'Paragraph Flow & Pacing',
    goal: 'Coordinate capitalization and comma pacing over paragraphs.',
    keys: ['All'],
    placement: 'Do not rush. Rhythm is the key to endurance.',
    text: 'Developing a relaxed cadence reduces finger fatigue and allows for longer, cleaner practice runs.',
    minWpm: 45,
    minAccuracy: 95
  },
  {
    id: 50,
    title: 'Final Intermediate Test',
    goal: 'Complete the intermediate curriculum test with high speed and accuracy.',
    keys: ['All'],
    placement: 'Apply all advanced home row and top/bottom reaches.',
    text: 'You have completed the Intermediate Typing Course! Outstanding work on your journey to mastering speed and accuracy.',
    minWpm: 50,
    minAccuracy: 95
  }
];
