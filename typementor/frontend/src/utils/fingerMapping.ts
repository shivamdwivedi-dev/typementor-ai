export type FingerId =
  | 'left_pinky'
  | 'left_ring'
  | 'left_middle'
  | 'left_index'
  | 'left_thumb'
  | 'right_thumb'
  | 'right_index'
  | 'right_middle'
  | 'right_ring'
  | 'right_pinky';

export type HandSide = 'left' | 'right';

export interface FingerInfo {
  id: FingerId;
  name: string;
  hand: HandSide;
  colorHex: string;
  tailwindBorder: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindActiveBg: string;
}

export const FINGER_DATA: Record<FingerId, FingerInfo> = {
  left_pinky: {
    id: 'left_pinky',
    name: 'Left Pinky',
    hand: 'left',
    colorHex: '#f43f5e', // Rose
    tailwindBorder: 'border-rose-500/60',
    tailwindText: 'text-rose-400',
    tailwindBg: 'bg-rose-950/20',
    tailwindActiveBg: 'bg-rose-500 text-slate-950 border-rose-400 font-black shadow-lg shadow-rose-500/40',
  },
  left_ring: {
    id: 'left_ring',
    name: 'Left Ring',
    hand: 'left',
    colorHex: '#f97316', // Orange
    tailwindBorder: 'border-orange-500/60',
    tailwindText: 'text-orange-400',
    tailwindBg: 'bg-orange-950/20',
    tailwindActiveBg: 'bg-orange-500 text-slate-950 border-orange-400 font-black shadow-lg shadow-orange-500/40',
  },
  left_middle: {
    id: 'left_middle',
    name: 'Left Middle',
    hand: 'left',
    colorHex: '#eab308', // Amber / Gold
    tailwindBorder: 'border-amber-500/60',
    tailwindText: 'text-amber-400',
    tailwindBg: 'bg-amber-950/20',
    tailwindActiveBg: 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/40',
  },
  left_index: {
    id: 'left_index',
    name: 'Left Index',
    hand: 'left',
    colorHex: '#10b981', // Emerald
    tailwindBorder: 'border-emerald-500/60',
    tailwindText: 'text-emerald-400',
    tailwindBg: 'bg-emerald-950/20',
    tailwindActiveBg: 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/40',
  },
  left_thumb: {
    id: 'left_thumb',
    name: 'Left Thumb',
    hand: 'left',
    colorHex: '#64748b', // Slate
    tailwindBorder: 'border-slate-500/60',
    tailwindText: 'text-slate-400',
    tailwindBg: 'bg-slate-900/40',
    tailwindActiveBg: 'bg-slate-300 text-slate-950 border-white font-black shadow-lg shadow-slate-300/40',
  },
  right_thumb: {
    id: 'right_thumb',
    name: 'Right Thumb',
    hand: 'right',
    colorHex: '#64748b', // Slate
    tailwindBorder: 'border-slate-500/60',
    tailwindText: 'text-slate-400',
    tailwindBg: 'bg-slate-900/40',
    tailwindActiveBg: 'bg-slate-300 text-slate-950 border-white font-black shadow-lg shadow-slate-300/40',
  },
  right_index: {
    id: 'right_index',
    name: 'Right Index',
    hand: 'right',
    colorHex: '#3b82f6', // Blue
    tailwindBorder: 'border-blue-500/60',
    tailwindText: 'text-blue-400',
    tailwindBg: 'bg-blue-950/20',
    tailwindActiveBg: 'bg-blue-500 text-slate-950 border-blue-400 font-black shadow-lg shadow-blue-500/40',
  },
  right_middle: {
    id: 'right_middle',
    name: 'Right Middle',
    hand: 'right',
    colorHex: '#6366f1', // Indigo
    tailwindBorder: 'border-indigo-500/60',
    tailwindText: 'text-indigo-400',
    tailwindBg: 'bg-indigo-950/20',
    tailwindActiveBg: 'bg-indigo-500 text-slate-950 border-indigo-400 font-black shadow-lg shadow-indigo-500/40',
  },
  right_ring: {
    id: 'right_ring',
    name: 'Right Ring',
    hand: 'right',
    colorHex: '#a855f7', // Purple
    tailwindBorder: 'border-purple-500/60',
    tailwindText: 'text-purple-400',
    tailwindBg: 'bg-purple-950/20',
    tailwindActiveBg: 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-lg shadow-purple-500/40',
  },
  right_pinky: {
    id: 'right_pinky',
    name: 'Right Pinky',
    hand: 'right',
    colorHex: '#d946ef', // Fuchsia
    tailwindBorder: 'border-fuchsia-500/60',
    tailwindText: 'text-fuchsia-400',
    tailwindBg: 'bg-fuchsia-950/20',
    tailwindActiveBg: 'bg-fuchsia-500 text-slate-950 border-fuchsia-400 font-black shadow-lg shadow-fuchsia-500/40',
  },
};

// Canonical QWERTY Key to Finger mapping
export const KEY_TO_FINGER_ID: Record<string, FingerId> = {
  // Left Pinky
  '`': 'left_pinky', '~': 'left_pinky',
  '1': 'left_pinky', '!': 'left_pinky',
  'q': 'left_pinky', 'Q': 'left_pinky',
  'a': 'left_pinky', 'A': 'left_pinky',
  'z': 'left_pinky', 'Z': 'left_pinky',
  'Tab': 'left_pinky', 'Caps': 'left_pinky', 'ShiftLeft': 'left_pinky',

  // Left Ring
  '2': 'left_ring', '@': 'left_ring',
  'w': 'left_ring', 'W': 'left_ring',
  's': 'left_ring', 'S': 'left_ring',
  'x': 'left_ring', 'X': 'left_ring',

  // Left Middle
  '3': 'left_middle', '#': 'left_middle',
  'e': 'left_middle', 'E': 'left_middle',
  'd': 'left_middle', 'D': 'left_middle',
  'c': 'left_middle', 'C': 'left_middle',

  // Left Index
  '4': 'left_index', '$': 'left_index',
  '5': 'left_index', '%': 'left_index',
  'r': 'left_index', 'R': 'left_index',
  't': 'left_index', 'T': 'left_index',
  'f': 'left_index', 'F': 'left_index',
  'g': 'left_index', 'G': 'left_index',
  'v': 'left_index', 'V': 'left_index',
  'b': 'left_index', 'B': 'left_index',

  // Thumbs
  ' ': 'right_thumb', // default space to right thumb

  // Right Index
  '6': 'right_index', '^': 'right_index',
  '7': 'right_index', '&': 'right_index',
  'y': 'right_index', 'Y': 'right_index',
  'u': 'right_index', 'U': 'right_index',
  'h': 'right_index', 'H': 'right_index',
  'j': 'right_index', 'J': 'right_index',
  'n': 'right_index', 'N': 'right_index',
  'm': 'right_index', 'M': 'right_index',

  // Right Middle
  '8': 'right_middle', '*': 'right_middle',
  'i': 'right_middle', 'I': 'right_middle',
  'k': 'right_middle', 'K': 'right_middle',
  ',': 'right_middle', '<': 'right_middle',

  // Right Ring
  '9': 'right_ring', '(': 'right_ring',
  'o': 'right_ring', 'O': 'right_ring',
  'l': 'right_ring', 'L': 'right_ring',
  '.': 'right_ring', '>': 'right_ring',

  // Right Pinky
  '0': 'right_pinky', ')': 'right_pinky',
  '-': 'right_pinky', '_': 'right_pinky',
  '=': 'right_pinky', '+': 'right_pinky',
  'p': 'right_pinky', 'P': 'right_pinky',
  '[': 'right_pinky', '{': 'right_pinky',
  ']': 'right_pinky', '}': 'right_pinky',
  '\\': 'right_pinky', '|': 'right_pinky',
  ';': 'right_pinky', ':': 'right_pinky',
  "'": 'right_pinky', '"': 'right_pinky',
  '/': 'right_pinky', '?': 'right_pinky',
  'Enter': 'right_pinky', 'Backspace': 'right_pinky', 'ShiftRight': 'right_pinky',
};

export interface ShiftHelper {
  requiresShift: boolean;
  shiftFingerId?: FingerId;
  charFingerId: FingerId;
}

export function getFingerForChar(char: string | undefined | null): ShiftHelper | null {
  if (!char) return null;

  const charFinger = KEY_TO_FINGER_ID[char] || KEY_TO_FINGER_ID[char.toLowerCase()];
  if (!charFinger) return null;

  // Check if character requires Shift modifier
  const isUpper = char.length === 1 && char !== char.toLowerCase() && char === char.toUpperCase() && /[A-Z]/.test(char);
  const shiftSymbols = '~!@#$%^&*()_+{}|:"<>?';
  const isShiftSymbol = shiftSymbols.includes(char);

  if (isUpper || isShiftSymbol) {
    const isLeftHandChar = FINGER_DATA[charFinger].hand === 'left';
    // Shift is pressed on opposite hand
    const shiftFingerId: FingerId = isLeftHandChar ? 'right_pinky' : 'left_pinky';
    return {
      requiresShift: true,
      shiftFingerId,
      charFingerId: charFinger,
    };
  }

  return {
    requiresShift: false,
    charFingerId: charFinger,
  };
}
