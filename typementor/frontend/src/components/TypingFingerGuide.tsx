import { useState, useMemo } from 'react';
import Hands3DCanvas from './Hands3DCanvas';
import VirtualKeyboard from './VirtualKeyboard';
import { getFingerForChar, FINGER_DATA, FingerId } from '../utils/fingerMapping';
import { Eye, EyeOff, Palette, RotateCcw, Sparkles } from 'lucide-react';

export interface TypingFingerGuideProps {
  targetCharacter: string | null;
  typedCharacter?: string | null;
  isCorrect?: boolean | null;
  isActive?: boolean;
  theme?: 'dark' | 'light';
  showKeyboard?: boolean;
  showHandLabels?: boolean;
  className?: string;
}

export default function TypingFingerGuide({
  targetCharacter,
  typedCharacter,
  isCorrect,
  isActive = true,
  theme = 'dark',
  showKeyboard = true,
  showHandLabels = true,
  className = '',
}: TypingFingerGuideProps) {
  // Feature Toggles (All functional)
  const [show3DHands, setShow3DHands] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [homeRowRestMode, setHomeRowRestMode] = useState<boolean>(false);

  // Derive target finger and shift requirements
  const mapping = useMemo(() => {
    if (homeRowRestMode || !isActive || !targetCharacter) return null;
    return getFingerForChar(targetCharacter);
  }, [targetCharacter, homeRowRestMode, isActive]);

  const activeFingerId = mapping ? mapping.charFingerId : null;
  const shiftFingerId = mapping && mapping.requiresShift ? mapping.shiftFingerId : null;

  // Active finger data for HUD
  const activeFingerData = activeFingerId ? FINGER_DATA[activeFingerId] : null;

  return (
    <div className={`space-y-4 w-full ${className}`}>
      {/* ── Toolbar Controls ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-1 rounded-xl text-brand-primary font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3D Finger Positioning Guide</span>
          </div>

          {activeFingerData && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-brand-border/40 font-mono text-xs">
              <span className="text-slate-400">Target Finger:</span>
              <span
                className="font-black px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${activeFingerData.colorHex}25`,
                  color: activeFingerData.colorHex,
                }}
              >
                {activeFingerData.name}
              </span>
              {mapping?.requiresShift && (
                <span className="text-rose-400 text-[10px] uppercase font-bold tracking-wider">
                  (+Opposite Shift)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShow3DHands((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              show3DHands
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                : 'bg-slate-900/40 border-brand-border/40 text-slate-400 hover:text-white'
            }`}
            title="Toggle 3D Hands Display"
          >
            {show3DHands ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">3D Hands</span>
          </button>

          <button
            type="button"
            onClick={() => setShowZones((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showZones
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-900/40 border-brand-border/40 text-slate-400 hover:text-white'
            }`}
            title="Toggle Finger-Zone Keyboard Colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Zones</span>
          </button>

          <button
            type="button"
            onClick={() => setHomeRowRestMode((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              homeRowRestMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900/40 border-brand-border/40 text-slate-400 hover:text-white'
            }`}
            title="Reset/Home Row Resting Position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Home-Row Rest</span>
          </button>
        </div>
      </div>

      {/* ── 3D Realistic Hands Section ────────────────────────────────────────── */}
      {show3DHands && (
        <div className="glass-panel rounded-2xl border border-brand-border/40 overflow-hidden bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950/80 shadow-2xl">
          <Hands3DCanvas
            activeFingerId={activeFingerId}
            shiftFingerId={shiftFingerId}
            isCorrect={isCorrect}
            theme={theme}
            showLabels={showHandLabels}
          />
        </div>
      )}

      {/* ── Virtual Keyboard Section ─────────────────────────────────────────── */}
      {showKeyboard && (
        <VirtualKeyboard
          currentExpectedChar={homeRowRestMode ? null : targetCharacter}
          recentlyTypedChar={typedCharacter}
          isCorrect={isCorrect}
          showFingerZones={showZones}
          highlightHomeRow={true}
        />
      )}

      {/* ── Finger-Zone Color Legend ─────────────────────────────────────────── */}
      {showZones && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-1 px-2 text-[10px] font-mono text-slate-400">
          {(['left_pinky', 'left_ring', 'left_middle', 'left_index'] as FingerId[]).map((fId) => (
            <div key={fId} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: FINGER_DATA[fId].colorHex }}
              />
              <span>{FINGER_DATA[fId].name.replace('Left ', 'L-')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: FINGER_DATA.right_thumb.colorHex }}
            />
            <span>Thumbs</span>
          </div>
          {(['right_index', 'right_middle', 'right_ring', 'right_pinky'] as FingerId[]).map((fId) => (
            <div key={fId} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: FINGER_DATA[fId].colorHex }}
              />
              <span>{FINGER_DATA[fId].name.replace('Right ', 'R-')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
