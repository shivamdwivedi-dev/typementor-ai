import { useMemo } from 'react';
import { FingerId, FINGER_DATA, KEY_TO_FINGER_ID } from '../utils/fingerMapping';

interface VirtualKeyboardProps {
  currentExpectedChar: string | null;
  recentlyTypedChar?: string | null;
  isCorrect?: boolean | null;
  showFingerZones?: boolean;
  highlightHomeRow?: boolean;
  className?: string;
}

// Row keys with display labels and physical width factors
interface KeyDef {
  char: string;
  display?: string;
  widthFactor?: number; // 1 = standard 1u, 1.5 = 1.5u, etc.
  fingerId: FingerId;
  isHomeRow?: boolean;
  hasBump?: boolean; // F and J tactile bumps
}

const ROWS: KeyDef[][] = [
  // Number row
  [
    { char: '`', fingerId: 'left_pinky' },
    { char: '1', fingerId: 'left_pinky' },
    { char: '2', fingerId: 'left_ring' },
    { char: '3', fingerId: 'left_middle' },
    { char: '4', fingerId: 'left_index' },
    { char: '5', fingerId: 'left_index' },
    { char: '6', fingerId: 'right_index' },
    { char: '7', fingerId: 'right_index' },
    { char: '8', fingerId: 'right_middle' },
    { char: '9', fingerId: 'right_ring' },
    { char: '0', fingerId: 'right_pinky' },
    { char: '-', fingerId: 'right_pinky' },
    { char: '=', fingerId: 'right_pinky' },
    { char: 'Backspace', display: '⌫', widthFactor: 1.5, fingerId: 'right_pinky' },
  ],
  // QWERTY row
  [
    { char: 'Tab', display: 'Tab', widthFactor: 1.3, fingerId: 'left_pinky' },
    { char: 'Q', fingerId: 'left_pinky' },
    { char: 'W', fingerId: 'left_ring' },
    { char: 'E', fingerId: 'left_middle' },
    { char: 'R', fingerId: 'left_index' },
    { char: 'T', fingerId: 'left_index' },
    { char: 'Y', fingerId: 'right_index' },
    { char: 'U', fingerId: 'right_index' },
    { char: 'I', fingerId: 'right_middle' },
    { char: 'O', fingerId: 'right_ring' },
    { char: 'P', fingerId: 'right_pinky' },
    { char: '[', fingerId: 'right_pinky' },
    { char: ']', fingerId: 'right_pinky' },
    { char: '\\', widthFactor: 1.2, fingerId: 'right_pinky' },
  ],
  // Home row (A - L ;)
  [
    { char: 'Caps', display: 'Caps', widthFactor: 1.5, fingerId: 'left_pinky' },
    { char: 'A', fingerId: 'left_pinky', isHomeRow: true },
    { char: 'S', fingerId: 'left_ring', isHomeRow: true },
    { char: 'D', fingerId: 'left_middle', isHomeRow: true },
    { char: 'F', fingerId: 'left_index', isHomeRow: true, hasBump: true },
    { char: 'G', fingerId: 'left_index' },
    { char: 'H', fingerId: 'right_index' },
    { char: 'J', fingerId: 'right_index', isHomeRow: true, hasBump: true },
    { char: 'K', fingerId: 'right_middle', isHomeRow: true },
    { char: 'L', fingerId: 'right_ring', isHomeRow: true },
    { char: ';', fingerId: 'right_pinky', isHomeRow: true },
    { char: "'", fingerId: 'right_pinky' },
    { char: 'Enter', display: 'Enter', widthFactor: 1.7, fingerId: 'right_pinky' },
  ],
  // Bottom row (Z - /)
  [
    { char: 'ShiftLeft', display: 'Shift', widthFactor: 1.8, fingerId: 'left_pinky' },
    { char: 'Z', fingerId: 'left_pinky' },
    { char: 'X', fingerId: 'left_ring' },
    { char: 'C', fingerId: 'left_middle' },
    { char: 'V', fingerId: 'left_index' },
    { char: 'B', fingerId: 'left_index' },
    { char: 'N', fingerId: 'right_index' },
    { char: 'M', fingerId: 'right_index' },
    { char: ',', fingerId: 'right_middle' },
    { char: '.', fingerId: 'right_ring' },
    { char: '/', fingerId: 'right_pinky' },
    { char: 'ShiftRight', display: 'Shift', widthFactor: 1.8, fingerId: 'right_pinky' },
  ],
];

export default function VirtualKeyboard({
  currentExpectedChar,
  recentlyTypedChar,
  isCorrect,
  showFingerZones = true,
  highlightHomeRow = true,
  className = '',
}: VirtualKeyboardProps) {
  // Normalize expected character to base keyboard key
  const normalizedExpected = useMemo(() => {
    if (!currentExpectedChar) return null;
    if (currentExpectedChar === ' ') return ' ';
    return currentExpectedChar.toUpperCase();
  }, [currentExpectedChar]);

  // Check if character requires Shift modifier
  const requiresShift = useMemo(() => {
    if (!currentExpectedChar || currentExpectedChar.length !== 1) return false;
    const isUpper = /[A-Z]/.test(currentExpectedChar);
    const shiftSymbols = '~!@#$%^&*()_+{}|:"<>?';
    return isUpper || shiftSymbols.includes(currentExpectedChar);
  }, [currentExpectedChar]);

  // Determine which Shift key lights up (opposite hand)
  const targetShiftSide = useMemo(() => {
    if (!requiresShift || !currentExpectedChar) return null;
    const fingerId = KEY_TO_FINGER_ID[currentExpectedChar];
    if (!fingerId) return 'ShiftRight';
    return FINGER_DATA[fingerId].hand === 'left' ? 'ShiftRight' : 'ShiftLeft';
  }, [requiresShift, currentExpectedChar]);

  return (
    <div className={`w-full bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-brand-border/40 select-none ${className}`}>
      {/* 4 Standard Key Rows */}
      <div className="space-y-1 sm:space-y-1.5 overflow-x-auto pb-1">
        {ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5 min-w-max">
            {row.map((k) => {
              const finger = FINGER_DATA[k.fingerId];
              const isTargetChar =
                normalizedExpected === k.char ||
                (currentExpectedChar && k.char.toLowerCase() === currentExpectedChar.toLowerCase());
              const isShiftTarget = k.char === targetShiftSide;
              const isTarget = isTargetChar || isShiftTarget;

              // Error flash indicator on recent mismatch
              const isRecentMistake =
                recentlyTypedChar &&
                recentlyTypedChar.toUpperCase() === k.char &&
                isCorrect === false;

              // Key width sizing
              const smWidth = k.widthFactor
                ? `calc(2.65rem * ${k.widthFactor})`
                : '2.65rem';

              return (
                <div
                  key={k.char}
                  style={{
                    width: smWidth,
                    minWidth: smWidth,
                  }}
                  className={`relative h-9 sm:h-11 rounded-lg border text-[11px] sm:text-xs font-bold flex flex-col items-center justify-center transition-all duration-150 ${
                    isTarget
                      ? `${finger.tailwindActiveBg} ring-2 ring-white/50 scale-[1.04] z-10`
                      : isRecentMistake
                      ? 'bg-rose-500/30 border-rose-500 text-rose-300 animate-shake'
                      : showFingerZones
                      ? `${finger.tailwindBg} ${finger.tailwindBorder} ${finger.tailwindText}`
                      : 'bg-slate-900 border-brand-border/30 text-slate-400'
                  }`}
                >
                  <span className="leading-none">{k.display || k.char}</span>

                  {/* Home Row Tactile Bumps on F and J */}
                  {k.hasBump && (
                    <span
                      className={`absolute bottom-1 w-2.5 h-[2px] rounded-full ${
                        isTarget ? 'bg-slate-950' : 'bg-slate-500/80'
                      }`}
                    />
                  )}

                  {/* Home row rest circle anchor */}
                  {highlightHomeRow && k.isHomeRow && !isTarget && (
                    <span
                      className="absolute top-1 right-1 w-1 h-1 rounded-full opacity-60"
                      style={{ backgroundColor: finger.colorHex }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Spacebar Row */}
        <div className="flex justify-center items-center gap-1.5 min-w-max pt-0.5 sm:pt-1">
          {/* Left Alt/Cmd placeholders for realistic deck layout */}
          <div className="w-12 sm:w-14 h-9 sm:h-11 rounded-lg border border-brand-border/20 bg-slate-900/60 text-[10px] text-slate-500 flex items-center justify-center font-mono">
            Alt
          </div>

          <div
            className={`h-9 sm:h-11 rounded-lg border text-xs font-bold flex items-center justify-center transition-all duration-150 uppercase tracking-widest ${
              normalizedExpected === ' '
                ? `${FINGER_DATA.right_thumb.tailwindActiveBg} ring-2 ring-white/50 scale-[1.02] z-10`
                : 'bg-slate-900 border-brand-border/30 text-slate-400'
            }`}
            style={{ width: '42%' }}
          >
            Spacebar
          </div>

          <div className="w-12 sm:w-14 h-9 sm:h-11 rounded-lg border border-brand-border/20 bg-slate-900/60 text-[10px] text-slate-500 flex items-center justify-center font-mono">
            Alt
          </div>
        </div>
      </div>
    </div>
  );
}
