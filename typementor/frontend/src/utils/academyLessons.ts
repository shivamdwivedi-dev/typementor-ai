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

export const ACADEMY_MILESTONES = {
  beginner: 50,
  intermediate: 90,
  advanced: 125,
} as const;

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    "id": 1,
    "title": "F & J: Tactile Anchor & Position",
    "goal": "Locate the small raised bumps on F and J without looking at the keyboard.",
    "keys": [
      "F",
      "J"
    ],
    "placement": "Place left index on F (feel the bump) and right index on J (feel the bump). Rest thumbs lightly on the spacebar.",
    "text": "f j f j ff jj f f j j fj jf ffjj jjff f j",
    "minWpm": 10,
    "minAccuracy": 80
  },
  {
    "id": 2,
    "title": "F & J: Alternation & Hand Balance",
    "goal": "Develop rhythmic alternation between left and right index fingers.",
    "keys": [
      "F",
      "J",
      " "
    ],
    "placement": "Anchor on F and J. Tap smoothly and use either thumb for the spacebar.",
    "text": "fff jjj ff jj f j f j ff jj f j fj jf fj",
    "minWpm": 12,
    "minAccuracy": 85
  },
  {
    "id": 3,
    "title": "F & J: N-Grams & Rhythm Cadence",
    "goal": "Build muscle memory for repeating patterns and spacebar cadence.",
    "keys": [
      "F",
      "J",
      " "
    ],
    "placement": "Keep hands completely still. Move only index fingers and thumbs.",
    "text": "fj jf f f j j ff jj fj jf ffjj jjff fff jjj",
    "minWpm": 14,
    "minAccuracy": 88
  },
  {
    "id": 4,
    "title": "F & J: Continuous Cadence Flow",
    "goal": "Maintain uninterrupted typing cadence without hesitation on spacebar.",
    "keys": [
      "F",
      "J",
      " "
    ],
    "placement": "Maintain light fingertip contact with the keycaps.",
    "text": "f j fj jf f j ff jj fj jf ffjj jjff f j fj jf",
    "minWpm": 15,
    "minAccuracy": 90
  },
  {
    "id": 5,
    "title": "F & J: Habit Mastery Gate",
    "goal": "Demonstrate effortless 95%+ precision on anchor keys before advancing.",
    "keys": [
      "F",
      "J",
      " "
    ],
    "placement": "Look only at the screen. Trust your tactile finger placement.",
    "text": "fj jf f j ff jj fj jf ffjj jjff fff jjj fj jf f j",
    "minWpm": 16,
    "minAccuracy": 95
  },
  {
    "id": 6,
    "title": "D & K: Middle Finger Reaches",
    "goal": "Introduce left middle finger on D and right middle finger on K.",
    "keys": [
      "D",
      "K"
    ],
    "placement": "Left middle on D, right middle on K. Index fingers remain anchored on F and J.",
    "text": "d k d k dd kk d d k k dk kd ddk kkd d k",
    "minWpm": 14,
    "minAccuracy": 85
  },
  {
    "id": 7,
    "title": "D & K: Alternation & Row Balancing",
    "goal": "Alternate between middle and index fingers across both hands.",
    "keys": [
      "D",
      "K",
      "F",
      "J"
    ],
    "placement": "Alternate smoothly: D to F on left hand, K to J on right hand.",
    "text": "dk kd df jk fd kj dk kd d k f j df jk fd kj",
    "minWpm": 15,
    "minAccuracy": 85
  },
  {
    "id": 8,
    "title": "D & K: Words & Real Digraphs",
    "goal": "Form pronounceable n-grams and vocabulary using D, K, F, and J.",
    "keys": [
      "D",
      "K",
      "F",
      "J"
    ],
    "placement": "Keep home row curve natural. Tap centered on keycaps.",
    "text": "fad jad dak kad fads feds def jek fed kid",
    "minWpm": 16,
    "minAccuracy": 88
  },
  {
    "id": 9,
    "title": "D & K: Rhythm & Sentence Flow",
    "goal": "Type continuous phrases combining D and K with anchor keys.",
    "keys": [
      "D",
      "K",
      "F",
      "J",
      " "
    ],
    "placement": "Relax wrists. Let fingers bounce lightly from the home row.",
    "text": "a kid had a fad; dad had a fad; fad and kid",
    "minWpm": 18,
    "minAccuracy": 90
  },
  {
    "id": 10,
    "title": "D & K: Habit Mastery Gate",
    "goal": "Lock in middle finger positioning with 95%+ accuracy.",
    "keys": [
      "D",
      "K",
      "F",
      "J",
      " "
    ],
    "placement": "Zero glance at keyboard. Maintain home row anchor.",
    "text": "dad fed a kid; a fad had a kid; dak kad feds",
    "minWpm": 18,
    "minAccuracy": 95
  },
  {
    "id": 11,
    "title": "S & L: Ring Finger Foundations",
    "goal": "Locate left ring finger on S and right ring finger on L.",
    "keys": [
      "S",
      "L"
    ],
    "placement": "Left ring finger rests on S, right ring finger rests on L.",
    "text": "s l s l ss ll s s l l sl ls ssl lls s l",
    "minWpm": 15,
    "minAccuracy": 85
  },
  {
    "id": 12,
    "title": "S & L: Ring & Index Coordination",
    "goal": "Coordinate ring finger taps with adjacent home row fingers.",
    "keys": [
      "S",
      "L",
      "D",
      "K",
      "F",
      "J"
    ],
    "placement": "Maintain arch in fingers. Do not flatten knuckles.",
    "text": "sl ls as ;l sa l; sl ls s l a ; as ;l sl ls",
    "minWpm": 16,
    "minAccuracy": 85
  },
  {
    "id": 13,
    "title": "S & L: Words & Syllable Stems",
    "goal": "Practice common English words and stems containing S and L.",
    "keys": [
      "S",
      "L",
      "A",
      "D",
      "F",
      "J",
      "K"
    ],
    "placement": "Stay anchored to home row throughout every word.",
    "text": "sad lad salad lass fall flask self leaf silk",
    "minWpm": 18,
    "minAccuracy": 88
  },
  {
    "id": 14,
    "title": "S & L: Sentence Flow & Cadence",
    "goal": "Flow through longer phrases using ring finger letters.",
    "keys": [
      "S",
      "L",
      "A",
      "D",
      "F",
      "J",
      "K",
      " "
    ],
    "placement": "Keep rhythm steady without stuttering on S and L.",
    "text": "a sad lad has a salad; a flask fell as lad slid",
    "minWpm": 20,
    "minAccuracy": 90
  },
  {
    "id": 15,
    "title": "S & L: Habit Mastery Gate",
    "goal": "Cement S and L independence with 95%+ precision target.",
    "keys": [
      "S",
      "L",
      "A",
      "D",
      "F",
      "J",
      "K",
      " "
    ],
    "placement": "Feel the natural isolation of ring fingers.",
    "text": "salad flask lad lass fall leaf silk sold call",
    "minWpm": 20,
    "minAccuracy": 95
  },
  {
    "id": 16,
    "title": "A & ;: Pinky Touch & Perimeter",
    "goal": "Position left pinky on A and right pinky on semicolon (;).",
    "keys": [
      "A",
      ";"
    ],
    "placement": "Left pinky rests on A, right pinky rests on ;. All eight fingers now on home row.",
    "text": "a ; a ; aa ;; a a ; ; a; ;a aa; ;;a a ;",
    "minWpm": 15,
    "minAccuracy": 85
  },
  {
    "id": 17,
    "title": "A & ;: Outer-to-Inner Finger Roll",
    "goal": "Roll fingers inward from pinky to index smoothly across both hands.",
    "keys": [
      "A",
      ";",
      "S",
      "L",
      "D",
      "K",
      "F",
      "J"
    ],
    "placement": "Roll A -> S -> D -> F and ; -> L -> K -> J.",
    "text": "a; ;a as ;l ad ;k af ;j a; ;a fa j; da k;",
    "minWpm": 16,
    "minAccuracy": 85
  },
  {
    "id": 18,
    "title": "A & ;: Common Words & Punctuation",
    "goal": "Type natural words ending with semicolon delimiters.",
    "keys": [
      "A",
      ";",
      "S",
      "L",
      "D",
      "F",
      "J",
      "K"
    ],
    "placement": "Tap semicolon with light touch; do not twist your wrist outward.",
    "text": "all fall ask alfa flask; alas; fall; asks; a;",
    "minWpm": 18,
    "minAccuracy": 88
  },
  {
    "id": 19,
    "title": "A & ;: Complete Home Row Sentences",
    "goal": "Combine all 8 home row keys in realistic continuous sentence flow.",
    "keys": [
      "A",
      ";",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      " "
    ],
    "placement": "Keep all fingers hovering in ready position above home keys.",
    "text": "all dads ask; a lad had a salad; alas; fall all;",
    "minWpm": 20,
    "minAccuracy": 90
  },
  {
    "id": 20,
    "title": "A & ;: Habit Mastery Gate",
    "goal": "Lock in complete 8-finger home row independence with 95%+ accuracy.",
    "keys": [
      "A",
      ";",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      " "
    ],
    "placement": "Zero glances down. Pure muscle memory.",
    "text": "a sad lad asks all dads; alas; a flask fell;",
    "minWpm": 20,
    "minAccuracy": 95
  },
  {
    "id": 21,
    "title": "G & H: Center Index Stretches",
    "goal": "Stretch left index to G and right index to H, then return to F and J.",
    "keys": [
      "G",
      "H"
    ],
    "placement": "Reach left index rightward to G; reach right index leftward to H. Always return.",
    "text": "g h g h gg hh fg jh gh hg fgf jhj g h",
    "minWpm": 18,
    "minAccuracy": 88
  },
  {
    "id": 22,
    "title": "G & H: Stretch & Return Rhythm",
    "goal": "Build quick return reflex back to F and J anchor bumps.",
    "keys": [
      "G",
      "H",
      "F",
      "J"
    ],
    "placement": "Snap fingers back to F and J immediately after tapping G or H.",
    "text": "fgf jhj g h fg gh jh hg ghf hfg fg jh gh hg",
    "minWpm": 19,
    "minAccuracy": 88
  },
  {
    "id": 23,
    "title": "G & H: Home Row Vocabulary",
    "goal": "Type full dictionary words utilizing center stretches.",
    "keys": [
      "G",
      "H",
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L"
    ],
    "placement": "Keep other fingers resting lightly in place while index stretches.",
    "text": "glad half flash dash glass flag hall glad fish",
    "minWpm": 20,
    "minAccuracy": 90
  },
  {
    "id": 24,
    "title": "G & H: Home Row Fluency Flow",
    "goal": "Type complete home row sentences with zero hand repositioning.",
    "keys": [
      "G",
      "H",
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      ";",
      " "
    ],
    "placement": "Focus on smooth, uninterrupted cadence.",
    "text": "a glad lad had a glass; dash half flag to hall",
    "minWpm": 22,
    "minAccuracy": 92
  },
  {
    "id": 25,
    "title": "G & H: Habit Mastery Gate",
    "goal": "Prove flawless home row control at 95%+ accuracy before exploring top row.",
    "keys": [
      "G",
      "H",
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      ";",
      " "
    ],
    "placement": "Complete mastery of all 10 home row keys.",
    "text": "half glad glass flash dash flag hall glad half",
    "minWpm": 22,
    "minAccuracy": 95
  },
  {
    "id": 26,
    "title": "E & I: Top Row Vowel Reaches",
    "goal": "Reach left middle finger up to E and right middle finger up to I.",
    "keys": [
      "E",
      "I"
    ],
    "placement": "Reach left middle up from D to E. Reach right middle up from K to I.",
    "text": "e i e i ee ii de ki ed ik e i de ki ed ik",
    "minWpm": 20,
    "minAccuracy": 88
  },
  {
    "id": 27,
    "title": "E & I: Vowel Alternation & Rolls",
    "goal": "Alternate vowel strokes between left and right hands.",
    "keys": [
      "E",
      "I",
      "D",
      "K",
      "F",
      "J"
    ],
    "placement": "Keep home row anchor with non-typing fingers.",
    "text": "de ki ed ik fe ji ef ij ei ie de ki ei ie de",
    "minWpm": 21,
    "minAccuracy": 88
  },
  {
    "id": 28,
    "title": "E & I: High-Frequency Vowel Words",
    "goal": "Type essential core words built around E and I.",
    "keys": [
      "E",
      "I",
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L"
    ],
    "placement": "Return to home row after every upward strike.",
    "text": "life like side hide feel see if is kid lie fed",
    "minWpm": 22,
    "minAccuracy": 90
  },
  {
    "id": 29,
    "title": "E & I: Vowel Cadence Flow",
    "goal": "Maintain rhythm across multi-word sentences containing E and I.",
    "keys": [
      "E",
      "I",
      "Home Row",
      " "
    ],
    "placement": "Glide fingers upward smoothly without jumping your hand.",
    "text": "she likes fish; he feels like a kid in life",
    "minWpm": 24,
    "minAccuracy": 92
  },
  {
    "id": 30,
    "title": "E & I: Habit Mastery Gate",
    "goal": "Achieve 95%+ precision on E and I top row transitions.",
    "keys": [
      "E",
      "I",
      "Home Row",
      " "
    ],
    "placement": "Firm tactile confidence on E and I vowel keys.",
    "text": "life like feel see side hide if is lie die kid",
    "minWpm": 24,
    "minAccuracy": 95
  },
  {
    "id": 31,
    "title": "R & U: Top Row Index Reach",
    "goal": "Reach left index up to R and right index up to U.",
    "keys": [
      "R",
      "U"
    ],
    "placement": "Reach left index up from F to R. Reach right index up from J to U.",
    "text": "r u r u rr uu fr ju rf uj r u fr ju rf uj",
    "minWpm": 20,
    "minAccuracy": 88
  },
  {
    "id": 32,
    "title": "R & U: Alternation & Row Travel",
    "goal": "Coordinate upward index reaches with middle finger vowels.",
    "keys": [
      "R",
      "U",
      "E",
      "I",
      "F",
      "J"
    ],
    "placement": "Alternate fluidly between left and right top row reaches.",
    "text": "fr ju rf uj ru ur dr ku rd uk ru ur fr ju ru",
    "minWpm": 21,
    "minAccuracy": 88
  },
  {
    "id": 33,
    "title": "R & U: Common Digraphs & Words",
    "goal": "Build muscle memory for high-frequency R and U vocabulary.",
    "keys": [
      "R",
      "U",
      "E",
      "I",
      "Home Row"
    ],
    "placement": "Keep wrists elevated and relaxed.",
    "text": "run red rug fur user sure fire rude pure drum",
    "minWpm": 22,
    "minAccuracy": 90
  },
  {
    "id": 34,
    "title": "R & U: Sentence Cadence",
    "goal": "Flow through sentences integrating R, U, E, I, and home row.",
    "keys": [
      "R",
      "U",
      "E",
      "I",
      "Home Row",
      " "
    ],
    "placement": "Keep fingers curved like holding a tennis ball.",
    "text": "the red rug is sure to dry; run far in pure fur",
    "minWpm": 24,
    "minAccuracy": 92
  },
  {
    "id": 35,
    "title": "R & U: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ precision on R and U top row keys.",
    "keys": [
      "R",
      "U",
      "E",
      "I",
      "Home Row",
      " "
    ],
    "placement": "Zero hesitation reaching up to R and U.",
    "text": "red rug run sure user fur fire rude pure drum",
    "minWpm": 24,
    "minAccuracy": 95
  },
  {
    "id": 36,
    "title": "T & Y: Diagonal Center Stretches",
    "goal": "Stretch left index up-right to T and right index up-left to Y.",
    "keys": [
      "T",
      "Y"
    ],
    "placement": "Stretch left index from F up-right to T. Stretch right index from J up-left to Y.",
    "text": "t y t y tt yy ft jy tf yj t y ft jy tf yj",
    "minWpm": 20,
    "minAccuracy": 88
  },
  {
    "id": 37,
    "title": "T & Y: Diagonal Recovery Rhythm",
    "goal": "Build quick recovery from diagonal top reaches back to F and J.",
    "keys": [
      "T",
      "Y",
      "F",
      "J"
    ],
    "placement": "Immediately snap index fingers back to anchor bumps.",
    "text": "ft jy tf yj ty yt tr yu rt uy ty yt ft jy ty",
    "minWpm": 21,
    "minAccuracy": 88
  },
  {
    "id": 38,
    "title": "T & Y: Core English Vocabulary",
    "goal": "Type crucial English words containing T and Y.",
    "keys": [
      "T",
      "Y",
      "Home Row",
      "E",
      "I",
      "R",
      "U"
    ],
    "placement": "Maintain steady stroke rhythm.",
    "text": "they that city stay duty trust yeti tray year",
    "minWpm": 23,
    "minAccuracy": 90
  },
  {
    "id": 39,
    "title": "T & Y: Fluency & Sentence Flow",
    "goal": "Integrate T and Y into continuous expressive sentences.",
    "keys": [
      "T",
      "Y",
      "Learned Keys",
      " "
    ],
    "placement": "Smooth hand coordination across center columns.",
    "text": "they stay in that city; trust your duty every year",
    "minWpm": 25,
    "minAccuracy": 92
  },
  {
    "id": 40,
    "title": "T & Y: Habit Mastery Gate",
    "goal": "Lock in T and Y diagonal reaches with 95%+ accuracy target.",
    "keys": [
      "T",
      "Y",
      "Learned Keys",
      " "
    ],
    "placement": "Effortless center top row muscle memory.",
    "text": "they that city stay duty trust yeti tray year day",
    "minWpm": 25,
    "minAccuracy": 95
  },
  {
    "id": 41,
    "title": "W & O: Ring Finger Upward Reach",
    "goal": "Reach left ring finger up to W and right ring finger up to O.",
    "keys": [
      "W",
      "O"
    ],
    "placement": "Reach left ring up from S to W. Reach right ring up from L to O.",
    "text": "w o w o ww oo sw lo ws ol w o sw lo ws ol",
    "minWpm": 20,
    "minAccuracy": 88
  },
  {
    "id": 42,
    "title": "W & O: Cross-Hand Coordination",
    "goal": "Alternate ring finger strikes between left and right hands.",
    "keys": [
      "W",
      "O",
      "S",
      "L"
    ],
    "placement": "Isolate ring fingers without dragging adjacent keys.",
    "text": "sw lo ws ol wo ow we oi ew io wo ow sw lo wo",
    "minWpm": 22,
    "minAccuracy": 88
  },
  {
    "id": 43,
    "title": "W & O: Common Word Patterns",
    "goal": "Type high-frequency words containing W and O.",
    "keys": [
      "W",
      "O",
      "Learned Keys"
    ],
    "placement": "Keep home row anchor with index and pinky fingers.",
    "text": "word work show slow flow wood world grow owl",
    "minWpm": 24,
    "minAccuracy": 90
  },
  {
    "id": 44,
    "title": "W & O: Sentence Cadence",
    "goal": "Flow through sentences featuring rich W and O vocabulary.",
    "keys": [
      "W",
      "O",
      "Learned Keys",
      " "
    ],
    "placement": "Maintain consistent pace across word transitions.",
    "text": "we work with wood; the water flow is slow in town",
    "minWpm": 26,
    "minAccuracy": 92
  },
  {
    "id": 45,
    "title": "W & O: Habit Mastery Gate",
    "goal": "Cement W and O ring reaches with 95%+ accuracy.",
    "keys": [
      "W",
      "O",
      "Learned Keys",
      " "
    ],
    "placement": "Complete ring finger independence on top row.",
    "text": "word work show slow flow wood world grow town low",
    "minWpm": 26,
    "minAccuracy": 95
  },
  {
    "id": 46,
    "title": "Q & P: Outer Pinky Extensions",
    "goal": "Reach left pinky up to Q and right pinky up to P.",
    "keys": [
      "Q",
      "P"
    ],
    "placement": "Reach left pinky up from A to Q. Reach right pinky up from ; to P.",
    "text": "q p q p qq pp aq ;p qa p; q p aq ;p qa p;",
    "minWpm": 18,
    "minAccuracy": 85
  },
  {
    "id": 47,
    "title": "Q & P: Corner Alternation & Speed",
    "goal": "Alternate outer pinky reaches across the keyboard corners.",
    "keys": [
      "Q",
      "P",
      "A",
      ";"
    ],
    "placement": "Maintain light hand poise. Return to home row instantly.",
    "text": "aq ;p qa p; qp pq quit spot part deep quiet pop",
    "minWpm": 20,
    "minAccuracy": 88
  },
  {
    "id": 48,
    "title": "Q & P: Stems & Real Words",
    "goal": "Practice vocabulary utilizing Q and P.",
    "keys": [
      "Q",
      "P",
      "Learned Keys"
    ],
    "placement": "Keep fingers arched on home row bases.",
    "text": "quick drop pure pool quote squad pipe equip pass",
    "minWpm": 22,
    "minAccuracy": 90
  },
  {
    "id": 49,
    "title": "Q & P: Full Top Row Sentence Flow",
    "goal": "Seamlessly combine all 10 top row keys with home row foundation.",
    "keys": [
      "Q",
      "P",
      "Top Row",
      "Home Row",
      " "
    ],
    "placement": "Rhythmic, relaxed cadence across upper keyboard.",
    "text": "drop that quick quote; spot pure power in quiet pipes",
    "minWpm": 25,
    "minAccuracy": 92
  },
  {
    "id": 50,
    "title": "Beginner Graduation: The Full Pangram Test",
    "goal": "Demonstrate complete Touch Typing mastery across Home and Top rows.",
    "keys": [
      "All Learned Keys"
    ],
    "placement": "Apply all posture, anchoring, and finger independence principles.",
    "text": "The quick brown fox jumps over the lazy dog repeatedly.",
    "minWpm": 30,
    "minAccuracy": 95
  },
  {
    "id": 51,
    "title": "V & M: Bottom Row Index Reaches",
    "goal": "Reach left index down-right to V and right index down-left to M.",
    "keys": [
      "V",
      "M"
    ],
    "placement": "Reach left index down from F to V. Reach right index down from J to M.",
    "text": "v m v m vv mm fv jm vf mj v m fv jm vf mj",
    "minWpm": 22,
    "minAccuracy": 88
  },
  {
    "id": 52,
    "title": "V & M: Downward Alternation",
    "goal": "Build quick return reflex from bottom row back to F and J.",
    "keys": [
      "V",
      "M",
      "F",
      "J"
    ],
    "placement": "Always return index fingers to anchor bumps.",
    "text": "fv jm vf mj vm mv ev im ve mi vm mv fv jm vm",
    "minWpm": 24,
    "minAccuracy": 88
  },
  {
    "id": 53,
    "title": "V & M: Common Bottom Row Words",
    "goal": "Practice vocabulary featuring V and M.",
    "keys": [
      "V",
      "M",
      "Learned Keys"
    ],
    "placement": "Curl index fingers under cleanly without dragging knuckles.",
    "text": "move view save make warm move visit farm calm",
    "minWpm": 25,
    "minAccuracy": 90
  },
  {
    "id": 54,
    "title": "V & M: Sentence Cadence",
    "goal": "Flow through sentences connecting top, home, and bottom rows.",
    "keys": [
      "V",
      "M",
      "Learned Keys",
      " "
    ],
    "placement": "Maintain steady pacing between row transitions.",
    "text": "make a move; visit my farm to view more warm views",
    "minWpm": 28,
    "minAccuracy": 92
  },
  {
    "id": 55,
    "title": "V & M: Habit Mastery Gate",
    "goal": "Lock in bottom row index transitions with 95%+ accuracy.",
    "keys": [
      "V",
      "M",
      "Learned Keys",
      " "
    ],
    "placement": "Effortless bottom row index finger muscle memory.",
    "text": "move view save make warm visit farm calm vital firm",
    "minWpm": 28,
    "minAccuracy": 95
  },
  {
    "id": 56,
    "title": "C & ,: Bottom Row Middle Reaches",
    "goal": "Reach left middle finger down to C and right middle finger down to comma (,).",
    "keys": [
      "C",
      ","
    ],
    "placement": "Reach left middle down from D to C. Reach right middle down from K to comma.",
    "text": "c , c , cc ,, dc k, cd ,k c , dc k, cd ,k",
    "minWpm": 22,
    "minAccuracy": 88
  },
  {
    "id": 57,
    "title": "C & ,: Middle Finger Alternation",
    "goal": "Alternate middle finger downward strokes smoothly.",
    "keys": [
      "C",
      ",",
      "D",
      "K"
    ],
    "placement": "Isolate middle fingers while index fingers anchor.",
    "text": "dc k, cd ,k c, ,c ic ,i ec ,e c, ,c dc k, c,",
    "minWpm": 24,
    "minAccuracy": 88
  },
  {
    "id": 58,
    "title": "C & ,: Natural Comma Word Lists",
    "goal": "Practice standard punctuation pauses after words.",
    "keys": [
      "C",
      ",",
      "Learned Keys"
    ],
    "placement": "Tap comma with right middle finger and immediately tap spacebar.",
    "text": "ice, cold, cat, city, fact, pace, race, code, card",
    "minWpm": 26,
    "minAccuracy": 90
  },
  {
    "id": 59,
    "title": "C & ,: Sentence Flow & Comma Pauses",
    "goal": "Type complete natural clauses separated by commas.",
    "keys": [
      "C",
      ",",
      "Learned Keys",
      " "
    ],
    "placement": "Maintain rhythm through comma and space sequences.",
    "text": "cats, dogs, and mice race across the ice, cold city",
    "minWpm": 28,
    "minAccuracy": 92
  },
  {
    "id": 60,
    "title": "C & ,: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ precision on C and comma placement.",
    "keys": [
      "C",
      ",",
      "Learned Keys",
      " "
    ],
    "placement": "Flawless comma and C coordination.",
    "text": "cold, clean, calm, clear, call, catch, code, card",
    "minWpm": 28,
    "minAccuracy": 95
  },
  {
    "id": 61,
    "title": "X & .: Bottom Row Ring Reaches",
    "goal": "Reach left ring finger down to X and right ring finger down to period (.).",
    "keys": [
      "X",
      "."
    ],
    "placement": "Reach left ring down from S to X. Reach right ring down from L to period.",
    "text": "x . x . xx .. sx l. xs .l x . sx l. xs .l",
    "minWpm": 22,
    "minAccuracy": 88
  },
  {
    "id": 62,
    "title": "X & .: Ring Alternation & Sentence Stops",
    "goal": "Coordinate bottom ring strikes with immediate spacebar cadence.",
    "keys": [
      "X",
      ".",
      "S",
      "L"
    ],
    "placement": "Curl ring finger cleanly to period without hitting adjacent comma.",
    "text": "sx l. xs .l x. .x ox .o ex .e x. .x sx l. x.",
    "minWpm": 24,
    "minAccuracy": 88
  },
  {
    "id": 63,
    "title": "X & .: Vocabulary & Period Endings",
    "goal": "Type high-frequency words containing X followed by sentence periods.",
    "keys": [
      "X",
      ".",
      "Learned Keys"
    ],
    "placement": "Keep home row anchor intact.",
    "text": "next. exit. tax. fix. mix. text. box. exact. six.",
    "minWpm": 26,
    "minAccuracy": 90
  },
  {
    "id": 64,
    "title": "X & .: Multi-Sentence Cadence",
    "goal": "Flow across multiple sentences ending with periods.",
    "keys": [
      "X",
      ".",
      "Learned Keys",
      " "
    ],
    "placement": "Smooth transitions from period to spacebar to next sentence.",
    "text": "we fix the tax. the next text is in the box. exit now.",
    "minWpm": 28,
    "minAccuracy": 92
  },
  {
    "id": 65,
    "title": "X & .: Habit Mastery Gate",
    "goal": "Cement X and period accuracy with 95%+ target.",
    "keys": [
      "X",
      ".",
      "Learned Keys",
      " "
    ],
    "placement": "Accurate ring finger curl to bottom row keys.",
    "text": "next text. fix that box. exit now. exact mix. six tax.",
    "minWpm": 28,
    "minAccuracy": 95
  },
  {
    "id": 66,
    "title": "Z & /: Bottom Row Pinky Extensions",
    "goal": "Reach left pinky down to Z and right pinky down to forward slash (/).",
    "keys": [
      "Z",
      "/"
    ],
    "placement": "Reach left pinky down from A to Z. Reach right pinky down from ; to slash.",
    "text": "z / z / zz // az ;/ za /; z / az ;/ za /;",
    "minWpm": 20,
    "minAccuracy": 85
  },
  {
    "id": 67,
    "title": "Z & /: Outer Pinky Alternation",
    "goal": "Alternate between outer bottom pinky keys smoothly.",
    "keys": [
      "Z",
      "/",
      "A",
      ";"
    ],
    "placement": "Keep hands balanced; do not drop wrists onto keyboard desk.",
    "text": "az ;/ za /; z/ /z oz /o iz /i z/ /z az ;/ z/",
    "minWpm": 22,
    "minAccuracy": 88
  },
  {
    "id": 68,
    "title": "Z & /: Words & Slash Expressions",
    "goal": "Practice vocabulary with Z and common slash delimiters.",
    "keys": [
      "Z",
      "/",
      "Learned Keys"
    ],
    "placement": "Curl pinky finger independently.",
    "text": "zero/one size/fit zone/area zoom/in freeze maze/path",
    "minWpm": 25,
    "minAccuracy": 90
  },
  {
    "id": 69,
    "title": "Z & /: Sentence Flow",
    "goal": "Type sentences integrating Z words and slash dividers.",
    "keys": [
      "Z",
      "/",
      "Learned Keys",
      " "
    ],
    "placement": "Light, fast pinky touch.",
    "text": "check the size/fit in zone zero before you zoom the maze",
    "minWpm": 28,
    "minAccuracy": 92
  },
  {
    "id": 70,
    "title": "Z & /: Habit Mastery Gate",
    "goal": "Achieve 95%+ precision on bottom row pinkies.",
    "keys": [
      "Z",
      "/",
      "Learned Keys",
      " "
    ],
    "placement": "Complete outer pinky touch confidence.",
    "text": "zero/one zone size zoom freeze maze/path zero blaze",
    "minWpm": 28,
    "minAccuracy": 95
  },
  {
    "id": 71,
    "title": "B & N: Bottom Center Stretches",
    "goal": "Reach left index down-right to B and right index down-left to N.",
    "keys": [
      "B",
      "N"
    ],
    "placement": "Reach left index from F to B. Reach right index from J to N.",
    "text": "b n b n bb nn fb jn bf nb b n fb jn bf nb",
    "minWpm": 24,
    "minAccuracy": 88
  },
  {
    "id": 72,
    "title": "B & N: Center Return Coordination",
    "goal": "Build quick return reflex from bottom center stretches back to F and J.",
    "keys": [
      "B",
      "N",
      "F",
      "J"
    ],
    "placement": "Snap back to F and J anchor keys after every B or N strike.",
    "text": "fb jn bf nb bn nb ab an ob on bn nb fb jn bn",
    "minWpm": 25,
    "minAccuracy": 88
  },
  {
    "id": 73,
    "title": "B & N: High-Frequency Vocabulary",
    "goal": "Type common English words with B and N.",
    "keys": [
      "B",
      "N",
      "Learned Keys"
    ],
    "placement": "Maintain natural arch in fingers.",
    "text": "bank bind bone name bend brand open burn blend",
    "minWpm": 27,
    "minAccuracy": 90
  },
  {
    "id": 74,
    "title": "B & N: Complete 3-Row Sentence Flow",
    "goal": "Flow across all three alphabet rows with zero visual assistance.",
    "keys": [
      "B",
      "N",
      "Learned Keys",
      " "
    ],
    "placement": "Fluid, rhythmic cadence across all 26 letters.",
    "text": "open a new bank; send the brand name and blend brown",
    "minWpm": 30,
    "minAccuracy": 92
  },
  {
    "id": 75,
    "title": "B & N: Habit Mastery Gate",
    "goal": "Lock in 95%+ accuracy across complete 26-letter alphabet.",
    "keys": [
      "B",
      "N",
      "Learned Keys",
      " "
    ],
    "placement": "Full alphabet mastery achieved.",
    "text": "bank bind bone name bend brand open burn blend brown",
    "minWpm": 30,
    "minAccuracy": 95
  },
  {
    "id": 76,
    "title": "Spacebar: Top 15 English Words",
    "goal": "Build rapid thumb release cadence on the most common English words.",
    "keys": [
      "Top 15 Words",
      " "
    ],
    "placement": "Thumb taps spacebar with light flick, never pressing hard.",
    "text": "the of and to in is you that it he was for on are as",
    "minWpm": 28,
    "minAccuracy": 90
  },
  {
    "id": 77,
    "title": "Spacebar: Alternating Hand Short Words",
    "goal": "Maintain consistent pace on alternating short words.",
    "keys": [
      "Short Words",
      " "
    ],
    "placement": "Keep hands level and relaxed.",
    "text": "with his they at be this have from or one had by word",
    "minWpm": 30,
    "minAccuracy": 90
  },
  {
    "id": 78,
    "title": "Spacebar: Fluid Story Flow",
    "goal": "Type continuous fluid narrative sentences without pausing at spaces.",
    "keys": [
      "Alphabet",
      " "
    ],
    "placement": "Spacebar stroke seamlessly blends into the next word initial letter.",
    "text": "the red fox ran to the tree and saw the rising sun",
    "minWpm": 32,
    "minAccuracy": 92
  },
  {
    "id": 79,
    "title": "Spacebar: Continuous Metronome Cadence",
    "goal": "Maintain steady WPM without stopping or speeding up erratically.",
    "keys": [
      "Alphabet",
      " "
    ],
    "placement": "Rhythm is the foundation of typing speed.",
    "text": "learning to type with steady rhythm builds natural speed",
    "minWpm": 34,
    "minAccuracy": 93
  },
  {
    "id": 80,
    "title": "Spacebar: Habit Mastery Gate",
    "goal": "Achieve 35+ WPM at 95%+ precision across continuous prose.",
    "keys": [
      "Alphabet",
      " "
    ],
    "placement": "Consistent cadence and zero hesitation.",
    "text": "type with steady cadence without pausing on any single word",
    "minWpm": 35,
    "minAccuracy": 95
  },
  {
    "id": 81,
    "title": "Shift: Opposite Pinky Coordination",
    "goal": "Use right Shift for left hand letters; use left Shift for right hand letters.",
    "keys": [
      "Shift",
      "Alphabet"
    ],
    "placement": "Hold Shift with opposite pinky, strike letter with other hand, release both.",
    "text": "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr",
    "minWpm": 26,
    "minAccuracy": 90
  },
  {
    "id": 82,
    "title": "Shift: Proper Nouns & Capitals",
    "goal": "Type capitalized city names with rapid Shift key releases.",
    "keys": [
      "Shift",
      "Proper Nouns"
    ],
    "placement": "Never use Caps Lock for single capital letters.",
    "text": "London Tokyo Paris Berlin Rome Madrid Oslo Seoul Bern",
    "minWpm": 28,
    "minAccuracy": 92
  },
  {
    "id": 83,
    "title": "Shift: Tech & Framework Names",
    "goal": "Type CamelCase and capitalized programming terms.",
    "keys": [
      "Shift",
      "Tech Terms"
    ],
    "placement": "Alternate shift pinkies quickly between syllables.",
    "text": "JavaScript Python TypeScript React Linux Docker GitHub",
    "minWpm": 30,
    "minAccuracy": 92
  },
  {
    "id": 84,
    "title": "Shift: Capitalized Sentence Flow",
    "goal": "Seamlessly transition between uppercase initials and lowercase bodies.",
    "keys": [
      "Shift",
      "Sentences",
      " "
    ],
    "placement": "Maintain natural typing rhythm through capitalization.",
    "text": "David and Sarah visited Tokyo, London, and New York.",
    "minWpm": 32,
    "minAccuracy": 93
  },
  {
    "id": 85,
    "title": "Shift: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ precision on mixed case sentences.",
    "keys": [
      "Shift",
      "Sentences",
      " "
    ],
    "placement": "Flawless opposite pinky Shift coordination.",
    "text": "Microsoft, Apple, Google, and Amazon lead global tech.",
    "minWpm": 34,
    "minAccuracy": 95
  },
  {
    "id": 86,
    "title": "Fluency: Multisyllabic Word Stems",
    "goal": "Type long vocabulary words with alternating hand patterns.",
    "keys": [
      "All Letters"
    ],
    "placement": "Keep hands relaxed. Do not rush over syllables.",
    "text": "understanding development architecture synchronization",
    "minWpm": 34,
    "minAccuracy": 92
  },
  {
    "id": 87,
    "title": "Fluency: Double Letters & Transitions",
    "goal": "Master finger transition speed on double characters.",
    "keys": [
      "All Letters",
      "Double Letters"
    ],
    "placement": "Quick double taps without tensing muscles.",
    "text": "the little yellow puppy rolled happily across green grass",
    "minWpm": 36,
    "minAccuracy": 93
  },
  {
    "id": 88,
    "title": "Fluency: Punctuation & Emotion Shifts",
    "goal": "Type sentences incorporating commas, questions, and exclamation marks.",
    "keys": [
      ",",
      "?",
      "!"
    ],
    "placement": "Reach for punctuation with right hand fingers while staying anchored.",
    "text": "Wait, did you see that? Yes, it was absolutely incredible!",
    "minWpm": 38,
    "minAccuracy": 93
  },
  {
    "id": 89,
    "title": "Fluency: Business Correspondence",
    "goal": "Type professional correspondence with smooth sentence transitions.",
    "keys": [
      "All Letters",
      "Punctuation"
    ],
    "placement": "Focus on fluid hand movements across the keys.",
    "text": "Please review the updated agreement and notify our team today.",
    "minWpm": 40,
    "minAccuracy": 94
  },
  {
    "id": 90,
    "title": "Intermediate Graduation: Professional Pacing Test",
    "goal": "Complete Intermediate Touch Typing certification with 45+ WPM and 95%+ precision.",
    "keys": [
      "Complete Alphabet",
      "Punctuation",
      "Shift"
    ],
    "placement": "Apply all advanced touch typing principles.",
    "text": "Consistent touch typing practice trains cognitive muscle memory for effortless writing.",
    "minWpm": 45,
    "minAccuracy": 95
  },
  {
    "id": 91,
    "title": "Numbers 1-5: Left Hand Reach",
    "goal": "Reach left hand fingers up from home row to numbers 1 through 5.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    "placement": "Pinky to 1, ring to 2, middle to 3, index to 4 and 5.",
    "text": "1 2 3 4 5 11 22 33 44 55 12 23 34 45 54 43 21",
    "minWpm": 25,
    "minAccuracy": 88
  },
  {
    "id": 92,
    "title": "Numbers 1-5: Alternating with Home Row",
    "goal": "Alternate between home row letters and left hand numbers.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "A",
      "S",
      "D",
      "F"
    ],
    "placement": "Reach up to number and return directly to home key.",
    "text": "a1 s2 d3 f4 f5 1a 2s 3d 4f 5f 12 34 51 24 35",
    "minWpm": 26,
    "minAccuracy": 88
  },
  {
    "id": 93,
    "title": "Numbers 1-5: Common Sequences & Years",
    "goal": "Type common numeric combinations and historical years.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    "placement": "Look at the screen, not your fingers.",
    "text": "1984 2025 1234 5432 15 25 35 45 50 102 304 505",
    "minWpm": 28,
    "minAccuracy": 90
  },
  {
    "id": 94,
    "title": "Numbers 1-5: Mixed Text & Numbers Flow",
    "goal": "Flow naturally between prose and numeric quantities.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "Alphabet"
    ],
    "placement": "Keep home row anchor intact with right hand.",
    "text": "Room 102 received 45 boxes on floor 3 at 5 sharp.",
    "minWpm": 30,
    "minAccuracy": 92
  },
  {
    "id": 95,
    "title": "Numbers 1-5: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ accuracy on left hand numbers row.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "Alphabet"
    ],
    "placement": "Confident left hand number reach.",
    "text": "order 123 arrived with 45 items in 5 sealed boxes",
    "minWpm": 32,
    "minAccuracy": 95
  },
  {
    "id": 96,
    "title": "Numbers 6-0: Right Hand Reach",
    "goal": "Reach right hand fingers up from home row to numbers 6 through 0.",
    "keys": [
      "6",
      "7",
      "8",
      "9",
      "0"
    ],
    "placement": "Index to 6 and 7, middle to 8, ring to 9, pinky to 0.",
    "text": "6 7 8 9 0 66 77 88 99 00 67 78 89 90 09 87 76",
    "minWpm": 25,
    "minAccuracy": 88
  },
  {
    "id": 97,
    "title": "Numbers 6-0: Full 1-0 Row Integration",
    "goal": "Coordinate complete 10-digit number row across both hands.",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0"
    ],
    "placement": "Left hand handles 1-5; right hand handles 6-0.",
    "text": "1 2 3 4 5 6 7 8 9 0 10 20 30 40 50 60 70 80 90 100",
    "minWpm": 28,
    "minAccuracy": 90
  },
  {
    "id": 98,
    "title": "Numbers 6-0: Phone Numbers & Account IDs",
    "goal": "Type realistic phone number, date, and identification patterns.",
    "keys": [
      "Numbers",
      "-",
      "#"
    ],
    "placement": "Keep thumb steady on spacebar while fingers reach numbers.",
    "text": "Call 800-555-0199 or verify account #40892 today.",
    "minWpm": 30,
    "minAccuracy": 92
  },
  {
    "id": 99,
    "title": "Numbers 6-0: Data Entry & Quantities",
    "goal": "Maintain typing speed through continuous data entry sentences.",
    "keys": [
      "Numbers",
      "Alphabet"
    ],
    "placement": "Maintain rhythm across number-word boundaries.",
    "text": "Invoice 7890 totaled 1250 units shipped to dock 68.",
    "minWpm": 32,
    "minAccuracy": 92
  },
  {
    "id": 100,
    "title": "Numbers Row: Habit Mastery Gate",
    "goal": "Lock in complete numbers row proficiency with 95%+ accuracy.",
    "keys": [
      "All Numbers",
      "Alphabet",
      "-"
    ],
    "placement": "Zero glance numbers row touch typing.",
    "text": "The serial code is 80492-76135 for server 90.",
    "minWpm": 35,
    "minAccuracy": 95
  },
  {
    "id": 101,
    "title": "Symbols: Email & Pricing (!, @, #, $, %)",
    "goal": "Coordinate Shift with numbers row to type standard symbols.",
    "keys": [
      "!",
      "@",
      "#",
      "$",
      "%"
    ],
    "placement": "Hold Shift with opposite hand while reaching numbers row.",
    "text": "email@domain.com #tag $150 20% off! $99.95 #code",
    "minWpm": 28,
    "minAccuracy": 88
  },
  {
    "id": 102,
    "title": "Symbols: Logic & Mathematics (^, &, *)",
    "goal": "Reach symbols across center and right hand: caret, ampersand, asterisk.",
    "keys": [
      "^",
      "&",
      "*"
    ],
    "placement": "Left pinky on Shift for ^ and &; right hand reaches 6 and 7.",
    "text": "up^high A & B *bold* 10 * 5 = 50 & then some *cool*",
    "minWpm": 30,
    "minAccuracy": 88
  },
  {
    "id": 103,
    "title": "Symbols: Invoicing & Calculations",
    "goal": "Type realistic invoicing lines combining currency, percentages, and fees.",
    "keys": [
      "$",
      "%",
      "&",
      "(",
      ")"
    ],
    "placement": "Alternate shift pinkies cleanly.",
    "text": "Total: $450 (with 15% discount & $25 fee applied)",
    "minWpm": 32,
    "minAccuracy": 90
  },
  {
    "id": 104,
    "title": "Symbols: Passwords & Config Tokens",
    "goal": "Type secure parameter strings with rapid symbol interleaving.",
    "keys": [
      "Symbols",
      "Alphabet",
      "Numbers"
    ],
    "placement": "Precision over speed when interleaving symbols.",
    "text": "User#42: Key=A$99%z! Token=@delta#78 & status=OK",
    "minWpm": 34,
    "minAccuracy": 92
  },
  {
    "id": 105,
    "title": "Symbols: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ accuracy on complex symbols row sentences.",
    "keys": [
      "Symbols",
      "Numbers",
      "Alphabet"
    ],
    "placement": "Confident Shift and numbers row muscle memory.",
    "text": "Save $50 (25% off) with promo #SPRING2026! Call (800) 555-0199.",
    "minWpm": 35,
    "minAccuracy": 95
  },
  {
    "id": 106,
    "title": "Delimiters: Parentheses, Brackets & Braces",
    "goal": "Reach and pair all four code brackets: (), [], {}, and <>.",
    "keys": [
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "<",
      ">"
    ],
    "placement": "Right pinky reaches brackets and braces. Shift for curly braces.",
    "text": "(parentheses) [brackets] {braces} <angles> () [] {} <>",
    "minWpm": 30,
    "minAccuracy": 90
  },
  {
    "id": 107,
    "title": "Delimiters: Quotes & Arithmetic Operators",
    "goal": "Type quotes, backticks, equals, plus, and comparison operators.",
    "keys": [
      "\"",
      "'",
      "`",
      "=",
      "+",
      "-",
      "<",
      ">"
    ],
    "placement": "Right pinky reaches quotes and equals.",
    "text": "\"double\" 'single' backtick + - * / = == != <= >=",
    "minWpm": 32,
    "minAccuracy": 90
  },
  {
    "id": 108,
    "title": "Delimiters: Markdown & Web Syntax",
    "goal": "Type markdown links, headers, and regular expressions.",
    "keys": [
      "[",
      "]",
      "(",
      ")",
      "#",
      "/",
      "\\"
    ],
    "placement": "Keep home row anchor while right pinky reaches brackets.",
    "text": "[TypeMentor](https://typementor.in) # heading \\w+ -_",
    "minWpm": 34,
    "minAccuracy": 92
  },
  {
    "id": 109,
    "title": "Delimiters: Nested Code Objects",
    "goal": "Practice nested brackets and object properties in code.",
    "keys": [
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      ":",
      ","
    ],
    "placement": "Stay relaxed during nested bracket typing.",
    "text": "item.map((x) => [x.id, { value: x.score + 10 }])",
    "minWpm": 36,
    "minAccuracy": 92
  },
  {
    "id": 110,
    "title": "Delimiters: Habit Mastery Gate",
    "goal": "Achieve 95%+ accuracy on real configuration syntax.",
    "keys": [
      "Delimiters",
      "Code"
    ],
    "placement": "Complete developer punctuation confidence.",
    "text": "const config = { host: \"localhost\", port: 5000, secure: true };",
    "minWpm": 38,
    "minAccuracy": 95
  },
  {
    "id": 111,
    "title": "Code: TypeScript & JavaScript Signatures",
    "goal": "Type modern asynchronous function declarations and generics.",
    "keys": [
      "Code",
      "Generics"
    ],
    "placement": "Type code syntax without glancing down.",
    "text": "export async function fetchData(url: string): Promise<Data>",
    "minWpm": 36,
    "minAccuracy": 92
  },
  {
    "id": 112,
    "title": "Code: Python & Data Science Syntax",
    "goal": "Type Python method definitions and keyword arguments.",
    "keys": [
      "Code",
      "Python"
    ],
    "placement": "Smooth transitions between snake_case and operators.",
    "text": "def calculate_metrics(df, threshold=0.95, debug=False):",
    "minWpm": 38,
    "minAccuracy": 92
  },
  {
    "id": 113,
    "title": "Code: React JSX & Component Props",
    "goal": "Type JSX elements, arrow callbacks, and string attributes.",
    "keys": [
      "JSX",
      "HTML"
    ],
    "placement": "Coordinate brackets, quotes, and equality symbols.",
    "text": "<button onClick={() => handleClick(id)} className=\"btn primary\">",
    "minWpm": 40,
    "minAccuracy": 92
  },
  {
    "id": 114,
    "title": "Code: SQL & Database Query Syntax",
    "goal": "Type capitalized SQL statements with clauses and operators.",
    "keys": [
      "SQL",
      "Shift"
    ],
    "placement": "Alternate shift pinkies quickly for uppercase SQL keywords.",
    "text": "SELECT id, name, wpm FROM users WHERE score >= 100 ORDER BY wpm DESC;",
    "minWpm": 42,
    "minAccuracy": 93
  },
  {
    "id": 115,
    "title": "Code: Habit Mastery Gate",
    "goal": "Demonstrate 95%+ precision on production React state hook code.",
    "keys": [
      "React",
      "TypeScript"
    ],
    "placement": "Developer-grade touch typing mastery.",
    "text": "const [state, setState] = useState<TypingState>(initialState);",
    "minWpm": 45,
    "minAccuracy": 95
  },
  {
    "id": 116,
    "title": "Speed Sprint Alpha: 50 WPM Target",
    "goal": "Push raw velocity over 50 WPM while maintaining posture.",
    "keys": [
      "Speed Sprint"
    ],
    "placement": "Keep fingers hovering mere millimeters above key surfaces.",
    "text": "maintain rapid rhythm without looking down at the keyboard surface",
    "minWpm": 50,
    "minAccuracy": 92
  },
  {
    "id": 117,
    "title": "Speed Sprint Beta: 55 WPM Target",
    "goal": "Accelerate through fluid English syllables to reach 55 WPM.",
    "keys": [
      "Speed Sprint"
    ],
    "placement": "Relax facial and shoulder muscles for maximum speed.",
    "text": "swift keystrokes combine muscle relaxation with razor sharp cognitive focus",
    "minWpm": 55,
    "minAccuracy": 92
  },
  {
    "id": 118,
    "title": "Speed Sprint Gamma: 60 WPM Target",
    "goal": "Break through the 60 WPM barrier with steady, unhurried cadence.",
    "keys": [
      "Speed Sprint"
    ],
    "placement": "Minimize finger travel distance for lightning-fast transitions.",
    "text": "maximize velocity by keeping fingers close to key surfaces during transitions",
    "minWpm": 60,
    "minAccuracy": 93
  },
  {
    "id": 119,
    "title": "Speed Sprint Delta: 65 WPM Target",
    "goal": "Achieve elite 65 WPM speed by practicing buffer reading.",
    "keys": [
      "Speed Sprint"
    ],
    "placement": "Read three words ahead of the word your fingers are typing.",
    "text": "elite typists read ahead three to four words while typing the current phrase",
    "minWpm": 65,
    "minAccuracy": 93
  },
  {
    "id": 120,
    "title": "Speed Sprint: Habit Mastery Gate",
    "goal": "Achieve elite 65 WPM speed with 95%+ accuracy.",
    "keys": [
      "Speed Sprint"
    ],
    "placement": "Harmonious velocity and absolute precision.",
    "text": "velocity is born from perfect precision and relaxed finger cadence",
    "minWpm": 65,
    "minAccuracy": 95
  },
  {
    "id": 121,
    "title": "Grandmaster Endurance I: Technical Prose",
    "goal": "Maintain high speed and stamina across an extended computer science passage.",
    "keys": [
      "Endurance",
      "Prose"
    ],
    "placement": "Breathe evenly. Let your fingers glide without tension.",
    "text": "The evolution of computer programming languages mirrors humanity's relentless quest for abstraction.",
    "minWpm": 50,
    "minAccuracy": 95
  },
  {
    "id": 122,
    "title": "Grandmaster Endurance II: Scientific Inquiry",
    "goal": "Type dense scientific vocabulary with unbroken concentration.",
    "keys": [
      "Endurance",
      "Science"
    ],
    "placement": "Steady pace throughout the entire sentence.",
    "text": "Quantum mechanics reveals that particles behave as probability waves until measured by an observer.",
    "minWpm": 52,
    "minAccuracy": 95
  },
  {
    "id": 123,
    "title": "Grandmaster Endurance III: Literary Artistry",
    "goal": "Experience the poetic rhythm of descriptive literary prose.",
    "keys": [
      "Endurance",
      "Literature"
    ],
    "placement": "Feel the melody in every word.",
    "text": "The golden sunlight filtered through autumn leaves as the gentle breeze carried whispers of morning.",
    "minWpm": 55,
    "minAccuracy": 95
  },
  {
    "id": 124,
    "title": "Grandmaster Endurance IV: Full System Architecture",
    "goal": "Type a complete Python neural network class with zero keystroke errors.",
    "keys": [
      "Endurance",
      "Architecture"
    ],
    "placement": "Total synthesis of letters, numbers, delimiters, and operators.",
    "text": "class NeuralNetwork: def __init__(self, layers): self.weights = [np.random.randn(y, x) for x, y in zip(layers[:-1], layers[1:])]",
    "minWpm": 50,
    "minAccuracy": 95
  },
  {
    "id": 125,
    "title": "Grandmaster Graduation: The Master Touch Typing Test",
    "goal": "Pass the final Grandmaster Examination to earn the TypeMentor AI Master Certification.",
    "keys": [
      "All Characters",
      "Master Test"
    ],
    "placement": "You have mastered every key on the keyboard. Type with pure confidence.",
    "text": "Congratulations on completing all 125 lessons of the TypeMentor AI Touch Typing Academy. You have mastered touch typing across letters, numbers, punctuation, and code.",
    "minWpm": 60,
    "minAccuracy": 96
  }
];
